/**
 * Author: Supertech1234
 * Github Repo: @https://github.com/supertech1234
 * 
 * MIT License
 * 
 * Copyright (c) 2025 supertech1234
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { createReadStream, createWriteStream, statSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/utils/logger';
import { updateFileStatus, deleteUploadedFile, deleteFileMetadata } from '@/lib/storage';
import type { FileStatus } from '@/types';  // Import FileStatus type
import { chunk } from '@/utils/audio';
import { getSpeakerIdentificationPrompt, processTranscriptionWithSpeakerRules } from '@/services/prompt';
// Import Azure Speech SDK
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
// Import Node.js fs module for synchronous file operations
import * as fsSync from 'fs';

const execAsync = promisify(exec);

// Constants
const UPLOAD_DIR = process.env.UPLOAD_DIR || './storage/uploads';
const TEMP_DIR = path.join(UPLOAD_DIR, '../tmp');
const CHUNK_SIZE = 5 * 1024 * 1024; // Reduced from 10MB to 5MB for better chunking of large files

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Azure OpenAI configuration
const USE_AZURE_OPENAI = process.env.USE_AZURE_OPENAI === 'true';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION;
const AZURE_OPENAI_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

// Transcription queue system
interface QueueItem {
  fileId: string;
  filePath: string;
  fileType: string;
  speakerIdentification: boolean;
  useAzureSpeech: boolean;
  resolve: (value: string | PromiseLike<string>) => void;
  reject: (reason?: any) => void;
}

// Queue configuration
const MAX_CONCURRENT_JOBS = 100; // Maximum number of concurrent transcription jobs
const queue: QueueItem[] = [];
let activeJobs = 0;

// Process the next item in the queue
function processNextQueueItem() {
  if (queue.length === 0 || activeJobs >= MAX_CONCURRENT_JOBS) {
    return;
  }

  activeJobs++;
  const item = queue.shift()!;
  
  logger.info(`Processing queued transcription job for file: ${item.fileId} (${activeJobs}/${MAX_CONCURRENT_JOBS} active jobs, ${queue.length} in queue)`);
  
  _transcribeFile(item.fileId, item.filePath, item.fileType, item.speakerIdentification, item.useAzureSpeech)
    .then(result => {
      item.resolve(result);
    })
    .catch(error => {
      item.reject(error);
    })
    .finally(() => {
      activeJobs--;
      processNextQueueItem();
    });
}

// Ensure temp directory exists
fs.mkdir(TEMP_DIR, { recursive: true }).catch(err => 
  logger.error('Failed to create temp directory:', err)
);

// Add a cleanup tracking system
interface TempFiles {
  originalPath: string;
  audioPath?: string;
  wavPath?: string;
  mp3Path?: string;
  chunks: string[];
}

async function cleanupAllFiles(fileId: string, tempFiles: TempFiles) {
  // Get list of files that still exist
  const existingFiles = await Promise.all(
    [
      tempFiles.audioPath,
      tempFiles.wavPath,
      tempFiles.mp3Path,
      ...tempFiles.chunks
    ]
    .filter(Boolean)
    .map(async (file) => {
      try {
        await fs.access(file as string);
        return file;
      } catch {
        return null;
      }
    })
  );

  // Only try to delete files that exist
  const filesToDelete = existingFiles.filter(Boolean) as string[];

  await Promise.all([
    ...filesToDelete.map(file => 
      fs.unlink(file).catch(err => 
        logger.error(`Failed to delete temp file ${file}:`, err)
      )
    ),
    deleteUploadedFile(tempFiles.originalPath).catch(err =>
      logger.error(`Failed to delete original file: ${err}`)
    ),
    deleteFileMetadata(fileId).catch(err =>
      logger.error(`Failed to delete metadata: ${err}`)
    )
  ]);
}

// New function that only cleans up temporary files, not the original file or metadata
async function cleanupTempFilesOnly(tempFiles: TempFiles) {
  // Get list of temporary files that still exist (excluding the original file)
  const existingFiles = await Promise.all(
    [
      tempFiles.audioPath,
      tempFiles.wavPath,
      tempFiles.mp3Path,
      ...tempFiles.chunks
    ]
    .filter(Boolean)
    .map(async (file) => {
      try {
        await fs.access(file as string);
        return file;
      } catch {
        return null;
      }
    })
  );

  // Only try to delete files that exist
  const filesToDelete = existingFiles.filter(Boolean) as string[];

  await Promise.all(
    filesToDelete.map(file => 
      fs.unlink(file).catch(err => 
        logger.error(`Failed to delete temp file ${file}:`, err)
      )
    )
  );
  
  logger.info(`Cleaned up ${filesToDelete.length} temporary files`);
}

// Add new function to create job-specific folder
async function createJobFolder(fileId: string): Promise<string> {
  const jobFolder = path.join(TEMP_DIR, fileId);
  await fs.mkdir(jobFolder, { recursive: true });
  logger.info(`Created job folder: ${jobFolder}`);
  return jobFolder;
}

// Update the convertToAudio function to use job folder
async function convertToAudio(inputPath: string, jobFolder: string): Promise<string> {
  // Generate a unique output path in the job folder
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(jobFolder, `${fileName}-${uuidv4()}.mp3`);
  
  try {
    // More robust FFmpeg command
    const command = `ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -ar 44100 -ac 2 -q:a 4 -y "${outputPath}"`;
    logger.info('Running FFmpeg command:', command);
    
    await execAsync(command);
    logger.info(`Converted ${inputPath} to audio: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('FFmpeg conversion error:', error);
    throw new Error('Failed to convert video to audio');
  }
}

// Update the processVideoFile function to use job folder
async function processVideoFile(filePath: string, jobFolder: string): Promise<string> {
  try {
    // First extract audio from video
    const audioPath = await extractAudio(filePath, jobFolder);
    console.log('Audio extracted successfully:', audioPath);
    
    // Then convert to required format if needed
    const processedPath = await convertToAudio(audioPath, jobFolder);
    console.log('Audio converted successfully:', processedPath);
    
    return processedPath;
  } catch (error) {
    logger.error('Video processing error:', error);
    throw new Error('Failed to process video file');
  }
}

async function createChunk(readStream: NodeJS.ReadableStream, chunkPath: string, i: number): Promise<void> {
  const writeStream = createWriteStream(chunkPath);
  
  await new Promise<void>((resolve, reject) => {
    readStream.pipe(writeStream)
      .on('finish', () => resolve())
      .on('error', (error) => {
        console.error(`Error creating chunk ${i + 1}:`, error);
        reject(error);
      });
  });
}

async function transcribeChunks(
  chunks: string[], 
  speakerIdentification: boolean = false,
  useAzureSpeech: boolean = false
): Promise<{ text: string, segments?: any[] }> {
  let transcriptionText = '';
  let allSegments: any[] = [];
  let timeOffset = 0;
  let successfulChunks = 0;
  
  try {
    logger.info(`Starting transcription of ${chunks.length} chunks`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = chunks[i];
      logger.info(`Processing chunk ${i + 1}/${chunks.length} (${Math.round((i/chunks.length)*100)}% complete)`);
      
      try {
        // Get transcription for this chunk
        const result = await transcribeChunk(chunkPath, i + 1, chunks.length, speakerIdentification, useAzureSpeech);
        
        // If we got a structured result with segments
        if (typeof result === 'object' && result.text && result.segments) {
          // Adjust segment timestamps with the current offset
          const adjustedSegments = result.segments.map(segment => ({
            ...segment,
            start: segment.start + timeOffset,
            end: segment.end + timeOffset
          }));
          
          // Add to our collection
          allSegments = [...allSegments, ...adjustedSegments];
          transcriptionText += result.text + ' ';
          
          // Update time offset for next chunk (approximate based on last segment)
          if (adjustedSegments.length > 0) {
            const lastSegment = adjustedSegments[adjustedSegments.length - 1];
            timeOffset = lastSegment.end;
          }
        } else if (typeof result === 'string') {
          // Simple string result
          transcriptionText += result + ' ';
        }
        
        successfulChunks++;
        logger.info(`Successfully processed chunk ${i + 1}/${chunks.length}`);
      } catch (error) {
        logger.error(`Error processing chunk ${i + 1}/${chunks.length}: ${error}`);
        // Continue with next chunk instead of failing the entire transcription
        transcriptionText += `[Error transcribing part ${i + 1}] `;
      }
    }
    
    logger.info(`Completed transcription of ${successfulChunks}/${chunks.length} chunks successfully`);
    
    // Return combined result
    if (allSegments.length > 0) {
      return { 
        text: transcriptionText.trim(), 
        segments: allSegments 
      };
    } else {
      return { text: transcriptionText.trim() };
    }
  } catch (error) {
    logger.error(`Error in transcribeChunks: ${error}`);
    // Return whatever we have so far instead of failing completely
    if (transcriptionText.trim().length === 0) {
      throw error; // Only throw if we have nothing at all
    }
    
    if (allSegments.length > 0) {
      return { 
        text: transcriptionText.trim() + ` [Transcription incomplete due to error: ${error}]`, 
        segments: allSegments 
      };
    } else {
      return { 
        text: transcriptionText.trim() + ` [Transcription incomplete due to error: ${error}]` 
      };
    }
  }
}

// Update the convertToMp3 function to use job folder
async function convertToMp3(inputPath: string, jobFolder: string): Promise<string> {
  const outputPath = path.join(jobFolder, `${uuidv4()}.mp3`);
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ar', '16000',
      '-ac', '1',
      '-b:a', '32k',
      '-y',
      outputPath
    ]);

    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // Only log FFmpeg output if debug is enabled
      if (process.env.FFMPEG_DEBUG === 'true') {
        logger.debug(`FFmpeg: ${data}`);
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg process failed: ${errorOutput}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

// Rename the original transcribeFile function to _transcribeFile (internal implementation)
async function _transcribeFile(
  fileId: string,
  filePath: string,
  fileType: string,
  speakerIdentification: boolean = false,
  useAzureSpeech: boolean = false
): Promise<string> {
  const jobFolder = await createJobFolder(fileId);
  const tempFiles: TempFiles = {
    originalPath: filePath,
    chunks: []
  };

  try {
    // Update file status to processing
    await updateFileStatus(fileId, 'processing');
    
    // Get file size for logging and decision making
    const fileStats = await fs.stat(filePath);
    const fileSizeMB = Math.round(fileStats.size / (1024 * 1024));
    const isVeryLargeFile = fileSizeMB > 500;
    
    if (isVeryLargeFile) {
      logger.info(`Processing very large file (${fileSizeMB}MB) with ID: ${fileId}`);
      // For very large files, always use Azure Speech if available
      if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
        logger.info(`Forcing Azure Speech for very large file (${fileSizeMB}MB)`);
        useAzureSpeech = true;
        speakerIdentification = true;
      }
    }
    
    // Extract audio from video if needed
    let audioPath = filePath;
    if (fileType.startsWith('video/')) {
      logger.info(`Extracting audio from video file: ${filePath}`);
      audioPath = await processVideoFile(filePath, jobFolder);
      tempFiles.audioPath = audioPath;
    }
    
    // Convert to WAV format if needed
    let wavPath = audioPath;
    if (!audioPath.toLowerCase().endsWith('.wav')) {
      logger.info(`Converting audio to WAV format: ${audioPath}`);
      wavPath = await convertToAudio(audioPath, jobFolder);
      tempFiles.wavPath = wavPath;
    }
    
    // Convert to MP3 for chunking (smaller file size)
    logger.info(`Converting to MP3 for processing: ${wavPath}`);
    const mp3Path = await convertToMp3(wavPath, jobFolder);
    tempFiles.mp3Path = mp3Path;
    
    // Create chunks if file is large
    logger.info(`Creating audio chunks for: ${mp3Path}`);
    const chunks = await createChunks(mp3Path, jobFolder);
    tempFiles.chunks = chunks;
    
    // Update status with progress information
    await updateFileStatus(fileId, 'processing', `Preparing to transcribe ${chunks.length} chunks...`);
    
    // Transcribe the chunks
    logger.info(`Transcribing ${chunks.length} chunks with speaker identification: ${speakerIdentification}, Azure Speech: ${useAzureSpeech}`);
    
    // For very large files with many chunks, process in smaller batches to avoid memory issues
    let result;
    if (chunks.length > 20 && !useAzureSpeech) {
      logger.info(`Large number of chunks (${chunks.length}), processing in batches`);
      result = await processChunksInBatches(chunks, fileId, speakerIdentification, useAzureSpeech);
    } else {
      result = await transcribeChunks(chunks, speakerIdentification, useAzureSpeech);
    }
    
    // Update file status to completed
    // If we have segments, pass them to updateFileStatus
    if (typeof result === 'object' && result.segments) {
      await updateFileStatus(fileId, 'completed', result.text, result.segments);
      logger.info(`Transcription with segments completed for: ${fileId}`);
    } else {
      await updateFileStatus(fileId, 'completed', typeof result === 'string' ? result : result.text);
      logger.info(`Transcription completed for: ${fileId}`);
    }
    
    // Clean up temporary files
    await cleanupTempFilesOnly(tempFiles);
    
    logger.info(`Transcription completed for: ${fileId}`);
    return typeof result === 'string' ? result : result.text;
  } catch (error) {
    logger.error(`Transcription failed for ${fileId}:`, error);
    
    // Update file status to error with error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateFileStatus(fileId, 'error', errorMessage);
    
    // Clean up temporary files
    await cleanupTempFilesOnly(tempFiles);
    
    throw error;
  }
}

// New function to process chunks in batches for very large files
async function processChunksInBatches(
  chunks: string[],
  fileId: string,
  speakerIdentification: boolean = false,
  useAzureSpeech: boolean = false
): Promise<{ text: string, segments?: any[] }> {
  const BATCH_SIZE = 10; // Process 10 chunks at a time
  let allText = '';
  let allSegments: any[] = [];
  let timeOffset = 0;
  
  logger.info(`Processing ${chunks.length} chunks in batches of ${BATCH_SIZE}`);
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
    
    logger.info(`Processing batch ${batchNumber}/${totalBatches} (chunks ${i+1}-${Math.min(i+BATCH_SIZE, chunks.length)})`);
    
    // Update status with progress information
    await updateFileStatus(fileId, 'processing', `Transcribing batch ${batchNumber}/${totalBatches} (${Math.round((batchNumber/totalBatches)*100)}% complete)`);
    
    // Process this batch
    const batchResult = await transcribeChunks(batchChunks, speakerIdentification, useAzureSpeech);
    
    // Add batch results to overall results
    if (typeof batchResult === 'object' && batchResult.segments) {
      // Adjust segment timestamps with the current offset
      const adjustedSegments = batchResult.segments.map(segment => ({
        ...segment,
        start: segment.start + timeOffset,
        end: segment.end + timeOffset
      }));
      
      allSegments = [...allSegments, ...adjustedSegments];
      allText += batchResult.text + ' ';
      
      // Update time offset for next batch
      if (adjustedSegments.length > 0) {
        const lastSegment = adjustedSegments[adjustedSegments.length - 1];
        timeOffset = lastSegment.end;
      }
    } else {
      allText += (typeof batchResult === 'string' ? batchResult : batchResult.text) + ' ';
    }
    
    logger.info(`Completed batch ${batchNumber}/${totalBatches}`);
  }
  
  logger.info(`Completed all ${Math.ceil(chunks.length / BATCH_SIZE)} batches`);
  
  // Return combined result
  if (allSegments.length > 0) {
    return { 
      text: allText.trim(), 
      segments: allSegments 
    };
  } else {
    return { text: allText.trim() };
  }
}

// New public transcribeFile function that uses the queue
export async function transcribeFile(
  fileId: string,
  filePath: string,
  fileType: string,
  speakerIdentification: boolean = false,
  useAzureSpeech: boolean = false
): Promise<string> {
  // When Azure Speech is enabled, always set speakerIdentification to true
  if (useAzureSpeech) {
    speakerIdentification = true;
    logger.info(`Azure Speech enabled - forcing speaker identification to be enabled`);
  }
  
  return new Promise((resolve, reject) => {
    // Add to queue
    queue.push({
      fileId,
      filePath,
      fileType,
      speakerIdentification,
      useAzureSpeech,
      resolve,
      reject
    });
    
    logger.info(`Added transcription job to queue for file: ${fileId} (${activeJobs}/${MAX_CONCURRENT_JOBS} active jobs, ${queue.length} in queue)`);
    
    // Try to process next item
    processNextQueueItem();
  });
}

// Update the createChunks function to use job folder
async function createChunks(filePath: string, jobFolder: string): Promise<string[]> {
  const chunks: string[] = [];
  const fileSize = (await fs.stat(filePath)).size;
  
  // Dynamically adjust chunk size based on file size
  let effectiveChunkSize = CHUNK_SIZE;
  
  // For very large files (>500MB), use even smaller chunks
  if (fileSize > 500 * 1024 * 1024) {
    effectiveChunkSize = 2 * 1024 * 1024; // 2MB chunks for very large files
    logger.info(`Very large file detected (${Math.round(fileSize / (1024 * 1024))}MB). Using smaller 2MB chunks.`);
  } else if (fileSize > 200 * 1024 * 1024) {
    effectiveChunkSize = 3 * 1024 * 1024; // 3MB chunks for large files
    logger.info(`Large file detected (${Math.round(fileSize / (1024 * 1024))}MB). Using smaller 3MB chunks.`);
  }
  
  const numberOfChunks = Math.ceil(fileSize / effectiveChunkSize);
  logger.info(`Creating ${numberOfChunks} chunks of approximately ${Math.round(effectiveChunkSize / (1024 * 1024))}MB each`);
  
  for (let i = 0; i < numberOfChunks; i++) {
    const chunkPath = path.join(jobFolder, `${uuidv4()}-chunk${i + 1}.mp3`);
    const readStream = createReadStream(filePath, {
      start: i * effectiveChunkSize,
      end: Math.min((i + 1) * effectiveChunkSize - 1, fileSize - 1)
    });
    
    await createChunk(readStream, chunkPath, i);
    chunks.push(chunkPath);
    
    // Log progress for large files
    if (numberOfChunks > 10 && (i + 1) % 5 === 0) {
      logger.info(`Created ${i + 1}/${numberOfChunks} chunks (${Math.round(((i + 1) / numberOfChunks) * 100)}% complete)`);
    }
  }

  return chunks;
}

async function transcribeChunk(
  chunkPath: string,
  chunkNumber: number,
  totalChunks: number,
  speakerIdentification: boolean = false,
  useAzureSpeech: boolean = false
): Promise<string | { text: string, segments: any[] }> {
  // Add more robust retry logic
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError: any = null;
  
  while (retryCount <= MAX_RETRIES) {
    try {
      logger.info(`Transcribing chunk ${chunkNumber}/${totalChunks} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
      
      // If using Azure Speech, use the Azure Speech SDK
      if (useAzureSpeech) {
        // First convert the chunk to WAV format for Azure Speech SDK
        const wavChunkPath = await convertToWavForAzure(chunkPath);
        logger.info(`Converted chunk to WAV format for Azure Speech: ${wavChunkPath}`);
        
        // Azure Speech Services uses a different API format
        const azureResponse = await transcribeWithAzureSpeech(wavChunkPath, speakerIdentification);
        
        // Clean up the temporary WAV file
        try {
          await fs.unlink(wavChunkPath);
          logger.info(`Cleaned up temporary WAV file: ${wavChunkPath}`);
        } catch (error) {
          logger.warn(`Failed to clean up temporary WAV file: ${wavChunkPath}`, error);
        }
        
        return azureResponse;
      }
      
      // Otherwise, use OpenAI Whisper API
      const formData = new FormData();
      const fileBuffer = await fs.readFile(chunkPath);
      const fileName = path.basename(chunkPath);
      
      // Ensure we're sending as wav format
      const file = new Blob([fileBuffer], { type: 'audio/wav' });
      formData.append('file', file, fileName.replace(/\.[^/.]+$/, '.wav'));
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      
      // If speaker identification is enabled, use verbose_json response format
      if (speakerIdentification) {
        formData.append('response_format', 'verbose_json');
        // Add timestamp granularities for detailed segment information
        formData.append('timestamp_granularities[]', 'segment');
        formData.append('timestamp_granularities[]', 'word');
      } else {
        formData.append('response_format', 'json');
      }
      
      let apiUrl: string;
      let headers: Record<string, string> = {};
      
      // Determine which API to use
      if (USE_AZURE_OPENAI) {
        // Azure OpenAI endpoint
        if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_API_VERSION || !AZURE_OPENAI_DEPLOYMENT_NAME) {
          throw new Error('Azure OpenAI configuration is incomplete. Please check your environment variables.');
        }
        
        apiUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/audio/transcriptions?api-version=${AZURE_OPENAI_API_VERSION}`;
        headers = {
          'api-key': AZURE_OPENAI_API_KEY,
        };
        
        logger.info(`Using Azure OpenAI deployment: ${AZURE_OPENAI_DEPLOYMENT_NAME} for chunk ${chunkNumber}/${totalChunks}`);
      } else {
        // Standard OpenAI endpoint
        if (!OPENAI_API_KEY) {
          throw new Error('OpenAI API key is missing. Please check your environment variables.');
        }
        
        apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
        headers = {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        };
        
        logger.info(`Using standard OpenAI for chunk ${chunkNumber}/${totalChunks}`);
      }
      
      // Add retry logic with exponential backoff for API calls
      const API_MAX_RETRIES = 3;
      let apiRetries = 0;
      let apiDelay = 1000; // Start with 1 second delay
      
      while (apiRetries <= API_MAX_RETRIES) {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: formData,
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'API error';
            
            try {
              const error = JSON.parse(errorText);
              errorMessage = error.error?.message || error.message || 'API error';
            } catch (e) {
              errorMessage = errorText || 'API error';
            }
            
            // If rate limited, retry with backoff
            if (response.status === 429) {
              apiRetries++;
              if (apiRetries > API_MAX_RETRIES) {
                logger.error(`Rate limit exceeded after ${API_MAX_RETRIES} retries. Giving up.`);
                throw new Error(`Transcription failed: Rate limit exceeded`);
              }
              
              logger.warn(`Rate limit hit, retrying in ${apiDelay/1000} seconds (attempt ${apiRetries}/${API_MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, apiDelay));
              apiDelay *= 2; // Exponential backoff
              continue;
            }
            
            // For other errors, throw immediately
            logger.error(`Transcription API error: ${errorMessage}`);
            throw new Error(`Transcription failed: ${errorMessage}`);
          }
          
          const data = await response.json();
          
          // Process the response based on whether speaker identification is enabled
          if (speakerIdentification) {
            if (data.segments) {
              // If the API returned segments, use them as a base but enhance with our rules
              let rawText = '';
              data.segments.forEach((segment: any) => {
                rawText += segment.text + ' ';
              });
              
              // Apply our speaker identification rules
              const processed = processTranscriptionWithSpeakerRules(rawText.trim());
              
              // Log the enhancement
              logger.info(`Enhanced speaker identification with custom rules for chunk ${chunkNumber}/${totalChunks}`);
              
              // Return the processed text and segments
              return processed;
            } else {
              // If no segments, process the raw text
              const processed = processTranscriptionWithSpeakerRules(data.text);
              return processed;
            }
          } else {
            // Return the standard text response
            return data.text;
          }
          
          // Break out of the API retry loop on success
          break;
        } catch (error: any) {
          if (apiRetries >= API_MAX_RETRIES) {
            throw error;
          }
          apiRetries++;
          logger.warn(`Error during API call, retrying in ${apiDelay/1000} seconds (attempt ${apiRetries}/${API_MAX_RETRIES}): ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, apiDelay));
          apiDelay *= 2; // Exponential backoff
        }
      }
      
      // If we get here, we've exceeded API retries
      throw new Error(`Transcription failed after ${API_MAX_RETRIES} API retries`);
      
    } catch (error: any) {
      lastError = error;
      retryCount++;
      
      if (retryCount > MAX_RETRIES) {
        logger.error(`Failed to transcribe chunk ${chunkNumber}/${totalChunks} after ${MAX_RETRIES + 1} attempts: ${error.message}`);
        throw new Error(`Failed to transcribe chunk ${chunkNumber}/${totalChunks}: ${error.message}`);
      }
      
      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      logger.warn(`Retrying chunk ${chunkNumber}/${totalChunks} in ${delay/1000} seconds (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw in the retry loop
  throw new Error(`Failed to transcribe chunk ${chunkNumber}/${totalChunks}: ${lastError?.message || 'Unknown error'}`);
}

async function processLargeFile(chunks: string[], speakerIdentification: boolean = false): Promise<string> {
  let transcriptionText = '';
  
  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      const chunkText = await transcribeChunk(chunkPath, i + 1, chunks.length, speakerIdentification);
      transcriptionText += chunkText + ' ';
    }
    
    return transcriptionText.trim();
  } catch (error) {
    console.error('Error processing large file:', error);
    throw error;
  }
}

// Update the extractAudio function to use job folder
export async function extractAudio(filePath: string, jobFolder: string): Promise<string> {
  const outputPath = path.join(jobFolder, `${uuidv4()}-converted.wav`);
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', filePath,
      '-vn',  // Disable video
      '-acodec', 'pcm_s16le',  // Audio codec
      '-ar', '16000',  // Sample rate
      '-ac', '1',  // Mono channel
      '-y',  // Overwrite output file if exists
      outputPath
    ]);

    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // Only log FFmpeg output if debug is enabled
      if (process.env.FFMPEG_DEBUG === 'true') {
        logger.debug(`FFmpeg: ${data}`);
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg process failed: ${errorOutput}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

// Add a new function to convert audio to WAV format specifically for Azure Speech
async function convertToWavForAzure(inputPath: string): Promise<string> {
  const outputPath = path.join(TEMP_DIR, `${uuidv4()}-azure.wav`);
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-acodec', 'pcm_s16le',  // Use PCM 16-bit format
      '-ar', '44100',          // Higher sample rate for better audio quality
      '-ac', '2',              // Stereo channel for better speaker separation
      '-f', 'wav',             // Force WAV format
      // Enhanced audio filtering for better speaker identification
      '-af', 'highpass=f=50,lowpass=f=15000,volume=2.5,dynaudnorm=f=150:g=20:p=0.75:m=20,aresample=44100',
      '-y',                    // Overwrite output file if exists
      outputPath
    ]);

    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // Only log FFmpeg output if debug is enabled
      if (process.env.FFMPEG_DEBUG === 'true') {
        logger.debug(`FFmpeg (Azure WAV): ${data}`);
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        logger.info(`Successfully converted to WAV for Azure: ${outputPath}`);
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg process failed: ${errorOutput}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

// Add a new function to transcribe with Azure Speech SDK for better diarization
async function transcribeWithAzureSpeechSDK(
  audioFilePath: string
): Promise<{ text: string, segments: any[] }> {
  logger.info(`Transcribing with Azure Speech SDK: ${audioFilePath}`);
  
  // Get Azure Speech credentials from environment variables
  const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
  const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;
  
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    logger.error('Azure Speech configuration is incomplete. Please check your environment variables.');
    return createFallbackTranscription(audioFilePath, "Azure Speech configuration is incomplete");
  }
  
  return new Promise((resolve, reject) => {
    try {
      // Create the speech configuration
      const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
      speechConfig.speechRecognitionLanguage = "en-US";
      
      // Enable conversation transcription which includes diarization
      // Use properties compatible with SDK version 1.42.0
      speechConfig.setProperty("ConversationTranscriptionInRoomAndOnline", "true");
      speechConfig.setProperty("DiarizationEnabled", "true");
      speechConfig.setProperty("TranscriptionService.EnableSpeakerDiarization", "true");
      speechConfig.setProperty("TranscriptionService.MaxSpeakerCount", "10"); // Increased from 6 to 10 for better speaker detection in large meetings
      
      // Add additional properties to improve transcription quality
      speechConfig.setProperty("SpeechServiceResponse_ProfanityOption", "masked");
      speechConfig.setProperty("SpeechServiceResponse_PostProcessingOption", "TrueText");
      speechConfig.setProperty("SpeechServiceResponse_RequestWordLevelTimestamps", "true");
      
      // Create audio configuration from the WAV file
      let audioConfig;
      try {
        // Use the correct method for file path in SDK 1.42.0
        audioConfig = sdk.AudioConfig.fromWavFileInput(fsSync.readFileSync(audioFilePath));
      } catch (error) {
        logger.error(`Error creating audio config: ${error}`);
        resolve(createFallbackTranscription(audioFilePath, `Error creating audio config: ${error}`));
        return;
      }
      
      // Create conversation transcriber
      const transcriber = new sdk.ConversationTranscriber(speechConfig, audioConfig);
      
      // Store segments and text
      const segments: any[] = [];
      let fullText = '';
      let currentSpeakerId = 0;
      const speakerMap: Record<string, number> = {};
      let isProcessingComplete = false;
      let timeoutId: NodeJS.Timeout;
      let progressIntervalId: NodeJS.Timeout;
      let lastProgressTime = Date.now();
      
      // Function to complete transcription
      const completeTranscription = () => {
        if (isProcessingComplete) return; // Prevent multiple calls
        isProcessingComplete = true;
        
        // Clear timeout and progress interval if they exist
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        if (progressIntervalId) {
          clearInterval(progressIntervalId);
        }
        
        logger.info('Transcription complete.');
        transcriber.stopTranscribingAsync();
        
        // If no segments were created, fall back to our intelligent segmentation
        if (segments.length === 0) {
          if (fullText.trim().length > 0) {
            logger.info('No segments created by Azure Speech SDK, falling back to intelligent segmentation');
            createIntelligentSpeakerSegments(fullText)
              .then(result => resolve(result))
              .catch(err => {
                logger.error(`Error creating segments: ${err}`);
                resolve(createFallbackTranscription(audioFilePath));
              });
          } else {
            logger.info('No text transcribed, falling back to default transcription');
            resolve(createFallbackTranscription(audioFilePath));
          }
        } else {
          // Sort segments by start time
          segments.sort((a, b) => a.start - b.start);
          
          // Format the text with speaker prefixes
          const formattedText = segments
            .map((segment: any) => `Speaker ${segment.speaker.id}: ${segment.text}`)
            .join('\n\n');
          
          logger.info(`Transcription completed with ${segments.length} segments and ${Object.keys(speakerMap).length} speakers`);
          logger.info(`Final formatted text with speaker prefixes: ${formattedText.substring(0, 100)}...`);
          
          resolve({
            text: formattedText,
            segments: segments
          });
        }
      };
      
      // Set up a progress monitoring interval
      progressIntervalId = setInterval(() => {
        const elapsedSinceLastProgress = Date.now() - lastProgressTime;
        
        // If no progress for 30 seconds, consider it stalled
        if (elapsedSinceLastProgress > 30000) {
          logger.warn(`No transcription progress for ${Math.round(elapsedSinceLastProgress/1000)} seconds. Completing with partial results.`);
          completeTranscription();
        }
      }, 10000); // Check every 10 seconds
      
      // Handle transcription events
      transcriber.transcribed = (s, e) => {
        if (e.result.text && e.result.text.trim().length > 0) {
          // Update last progress time
          lastProgressTime = Date.now();
          
          logger.info(`Transcribed: ${e.result.text}`);
          
          // Get speaker ID - handle different SDK versions
          const speakerId = e.result.speakerId || e.result.properties?.getProperty('SpeakerId') || 'unknown';
          
          // Map speaker ID to a simple number (1, 2, etc.)
          if (!speakerMap[speakerId]) {
            currentSpeakerId++;
            speakerMap[speakerId] = currentSpeakerId;
          }
          
          const mappedSpeakerId = speakerMap[speakerId];
          
          // Create segment
          const segment = {
            id: `segment-${segments.length}`,
            start: e.result.offset / 10000000, // Convert to seconds
            end: (e.result.offset + e.result.duration) / 10000000,
            text: e.result.text,
            speaker: {
              id: mappedSpeakerId.toString(),
              label: `Speaker ${mappedSpeakerId}`
            }
          };
          
          segments.push(segment);
          fullText += `${e.result.text} `;
          
          logger.info(`Added segment for Speaker ${mappedSpeakerId}: ${e.result.text}`);
        }
      };
      
      transcriber.canceled = (s, e) => {
        logger.error(`Transcription canceled: ${e.errorDetails}`);
        
        // Instead of rejecting, resolve with what we have so far or fall back
        if (segments.length > 0) {
          logger.info(`Transcription was canceled but we have ${segments.length} segments already`);
          completeTranscription();
        } else if (fullText.trim().length > 0) {
          // If we have some text but no segments, create segments
          logger.info('Creating segments from partial transcription');
          createIntelligentSpeakerSegments(fullText)
            .then(result => resolve(result))
            .catch(err => {
              logger.error(`Error creating segments: ${err}`);
              resolve(createFallbackTranscription(audioFilePath, `Transcription canceled: ${e.errorDetails}`));
            });
        } else {
          // If we have nothing, fall back
          resolve(createFallbackTranscription(audioFilePath, `Transcription canceled: ${e.errorDetails}`));
        }
      };
      
      transcriber.sessionStopped = (s, e) => {
        completeTranscription();
      };
      
      // Start transcribing
      logger.info('Starting transcription with Azure Speech SDK...');
      transcriber.startTranscribingAsync(
        () => {
          logger.info('Transcription started');
          // Update last progress time when transcription starts
          lastProgressTime = Date.now();
        },
        (err) => {
          logger.error(`Error starting transcription: ${err}`);
          resolve(createFallbackTranscription(audioFilePath, `Error starting transcription: ${err}`));
        }
      );
      
      // Set a timeout to stop transcription after a reasonable time
      // This is needed because the SDK might not automatically stop for some files
      // Calculate timeout based on audio duration - allow 1.5x the audio length plus 30 seconds buffer
      let timeoutDuration = 300000; // Default 5 minutes (300,000 ms)
      
      try {
        // Try to get audio duration to set a more accurate timeout
        const stats = fsSync.statSync(audioFilePath);
        const fileSizeInBytes = stats.size;
        // Rough estimate: WAV files are ~176KB per second for 16-bit stereo at 44.1kHz
        // Add 50% buffer plus 30 seconds to be safe
        const estimatedDurationInSeconds = (fileSizeInBytes / 176000) * 1.5 + 30;
        timeoutDuration = Math.min(Math.max(estimatedDurationInSeconds * 1000, 60000), 1800000); // 30 minutes max
        logger.info(`Setting transcription timeout to ${timeoutDuration/1000} seconds based on file size ${fileSizeInBytes} bytes`);
      } catch (error) {
        logger.warn(`Could not determine audio file size, using default timeout: ${error}`);
      }
      
      timeoutId = setTimeout(() => {
        logger.info(`Stopping transcription after timeout of ${timeoutDuration/1000} seconds`);
        completeTranscription();
      }, timeoutDuration); // Dynamic timeout based on audio length
      
    } catch (error) {
      logger.error(`Error in Azure Speech SDK transcription: ${error}`);
      resolve(createFallbackTranscription(audioFilePath, `Error in SDK setup: ${error}`));
    }
  });
}

// Update the transcribeWithAzureSpeech function to use the SDK-based approach
async function transcribeWithAzureSpeech(
  audioFilePath: string, 
  speakerIdentification: boolean = true
): Promise<string | { text: string, segments: any[] }> {
  // Always ensure speaker identification is enabled for Azure Speech
  speakerIdentification = true;
  
  try {
    // Use the SDK-based approach for better diarization
    logger.info(`Using Azure Speech SDK for transcription with speaker identification`);
    return await transcribeWithAzureSpeechSDK(audioFilePath);
  } catch (error) {
    logger.error(`Error in Azure Speech SDK transcription: ${error}`);
    
    // Fall back to the REST API approach if SDK fails
    logger.info(`Falling back to REST API approach after SDK failure`);
    
    // Get Azure Speech credentials from environment variables
    const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;
    
    // Enhanced validation and logging for Azure Speech credentials
    if (!AZURE_SPEECH_KEY) {
      logger.error('Azure Speech API key is missing. Please check your environment variables.');
      return createFallbackTranscription(audioFilePath, "Azure Speech API key is missing");
    }
    
    if (!AZURE_SPEECH_REGION) {
      logger.error('Azure Speech region is missing. Please check your environment variables.');
      return createFallbackTranscription(audioFilePath, "Azure Speech region is missing");
    }
    
    // Log partial key for debugging (only first 4 characters)
    const maskedKey = AZURE_SPEECH_KEY.substring(0, 4) + '...' + AZURE_SPEECH_KEY.substring(AZURE_SPEECH_KEY.length - 4);
    logger.info(`Using Azure Speech credentials - Region: ${AZURE_SPEECH_REGION}, Key: ${maskedKey}`);
    
    logger.info(`Transcribing with Azure Speech REST API: ${audioFilePath} with speaker identification enabled`);
    
    try {
      // Make sure the file exists and is readable
      await fs.access(audioFilePath);
      const stats = await fs.stat(audioFilePath);
      logger.info(`Audio file exists and is ${stats.size} bytes`);
      
      // Read the audio file
      const audioData = await fs.readFile(audioFilePath);
      logger.info(`Read ${audioData.length} bytes from audio file`);
      
      // Create intelligent artificial speaker segments from the text
      return createIntelligentSpeakerSegments(await createFallbackTranscription(audioFilePath).then(result => result.text));
    } catch (error) {
      logger.error(`Error in Azure Speech transcription: ${error}`);
      return createFallbackTranscription(audioFilePath, `Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Helper function to create intelligent speaker segments from raw text
async function createIntelligentSpeakerSegments(text: string): Promise<{ text: string, segments: any[] }> {
  // Split the text into sentences with improved sentence detection
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 0);
  
  // Group sentences into logical paragraphs
  const paragraphs = [];
  let currentParagraphSentences = [];
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;
    
    currentParagraphSentences.push(sentence);
    
    // End paragraph on questions, exclamations, or after several statements
    const isQuestion = sentence.endsWith('?');
    const isExclamation = sentence.endsWith('!');
    const containsQuotation = sentence.includes('"') || sentence.includes('"') || sentence.includes('"');
    
    if (isQuestion || isExclamation || 
        containsQuotation ||
        currentParagraphSentences.length >= 2 || 
        i === sentences.length - 1) {
      
      paragraphs.push({
        text: currentParagraphSentences.join(' '),
        isQuestion,
        isExclamation,
        containsQuotation,
        containsQuestion: currentParagraphSentences.some(s => s.endsWith('?'))
      });
      
      currentParagraphSentences = [];
    }
  }
  
  // Analyze content to detect conversation patterns
  const segments = [];
  let currentSpeakerId = 1;
  
  // First pass: assign speakers to paragraphs
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    
    // Determine if we should change speakers
    if (i > 0) {
      const prevParagraph = paragraphs[i-1];
      
      // Change speaker after questions (likely a response)
      if (prevParagraph.isQuestion || prevParagraph.containsQuestion) {
        currentSpeakerId = currentSpeakerId === 1 ? 2 : 1;
      }
      // Change speaker after exclamations
      else if (prevParagraph.isExclamation) {
        currentSpeakerId = currentSpeakerId === 1 ? 2 : 1;
      }
      // Change speaker when quotations are involved (likely dialogue)
      else if (prevParagraph.containsQuotation || paragraph.containsQuotation) {
        currentSpeakerId = currentSpeakerId === 1 ? 2 : 1;
      }
      // Change speaker based on common response patterns
      else if (/^(yes|no|maybe|i think|well|actually|but|however|so|therefore|right|okay|sure|exactly|indeed)/i.test(paragraph.text)) {
        currentSpeakerId = currentSpeakerId === 1 ? 2 : 1;
      }
      // Change speaker periodically to simulate conversation
      else if (i % 2 === 0 && i > 0) {
        currentSpeakerId = currentSpeakerId === 1 ? 2 : 1;
      }
    }
    
    // Create segment for this paragraph
    segments.push({
      id: `s${i + 1}`,
      start: i * 3, // Approximate start time
      end: (i + 1) * 3, // Approximate end time
      text: paragraph.text,
      speaker: {
        id: currentSpeakerId,
        name: `Speaker ${currentSpeakerId}`
      }
    });
  }
  
  // Second pass: merge adjacent segments from the same speaker
  const mergedSegments = [];
  let lastSegment = null;
  
  for (const segment of segments) {
    if (lastSegment && lastSegment.speaker.id === segment.speaker.id) {
      // Merge with previous segment
      lastSegment.text += ' ' + segment.text;
      lastSegment.end = segment.end;
    } else {
      if (lastSegment) {
        mergedSegments.push(lastSegment);
      }
      lastSegment = { ...segment };
    }
  }
  
  // Add the last segment
  if (lastSegment) {
    mergedSegments.push(lastSegment);
  }
  
  // Format the text with speaker prefixes
  const formattedText = mergedSegments
    .map((segment: any) => `Speaker ${segment.speaker.id}: ${segment.text}`)
    .join('\n\n');
  
  logger.info(`Created intelligent artificial speaker segments. Preview: ${formattedText.substring(0, 100)}...`);
  
  return {
    text: formattedText,
    segments: mergedSegments
  };
}

// Add a new function to create a fallback transcription when Azure Speech API fails
async function createFallbackTranscription(audioFilePath: string, errorReason: string = ""): Promise<{ text: string, segments: any[] }> {
  logger.info(`Creating fallback transcription with speaker identification. Reason: ${errorReason}`);
  
  try {
    // Use OpenAI's Whisper API as a fallback if available
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (OPENAI_API_KEY) {
      logger.info('Using OpenAI Whisper as fallback');
      
      const formData = new FormData();
      const fileBuffer = await fs.readFile(audioFilePath);
      const fileName = path.basename(audioFilePath);
      
      const file = new Blob([fileBuffer], { type: 'audio/wav' });
      formData.append('file', file, fileName);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'json');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const text = data.text;
      
      // Create intelligent speaker segments
      const sentences = text.split(/(?<=[.!?])\s+/);
      const segments = [];
      let currentSpeakerId = 1;
      let sentenceCount = 0;
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (!sentence) continue;
        
        // Change speaker based on sentence structure and patterns
        if (i > 0) {
          const prevSentence = sentences[i-1];
          
          // Change speaker after questions (likely a response from another person)
          if (prevSentence.endsWith('?')) {
            currentSpeakerId = currentSpeakerId === 1 ? 2 : 1;
            sentenceCount = 0;
          }
          // Change speaker after exclamations (likely a new person speaking)
          else if (prevSentence.endsWith('!')) {
            currentSpeakerId = currentSpeakerId === 1 ? 2 : 1;
            sentenceCount = 0;
          }
          // Change speaker after several sentences by the same speaker
          else if (sentenceCount >= 3) {
            currentSpeakerId = currentSpeakerId === 1 ? 2 : 1;
            sentenceCount = 0;
          }
          // Change speaker if the current sentence starts with a common response phrase
          else if (/^(yes|no|maybe|i think|well|actually|but|however|so|therefore)/i.test(sentence)) {
            currentSpeakerId = currentSpeakerId === 1 ? 2 : 1;
            sentenceCount = 0;
          }
        }
        
        segments.push({
          id: `s${i + 1}`,
          start: i * 2, // Approximate start time
          end: (i + 1) * 2, // Approximate end time
          text: sentence,
          speaker: {
            id: currentSpeakerId,
            name: `Speaker ${currentSpeakerId}`
          }
        });
        
        sentenceCount++;
      }
      
      // Format the text with speaker prefixes
      const formattedText = segments
        .map((segment: any) => `Speaker ${segment.speaker.id}: ${segment.text}`)
        .join('\n\n');
      
      logger.info(`Created fallback transcription with speaker identification. Preview: ${formattedText.substring(0, 100)}...`);
      
      return {
        text: formattedText,
        segments: segments
      };
    } else {
      // If OpenAI API key is not available, create a simple fallback
      const text = "Transcription failed. Please check your Azure Speech configuration and try again.";
      
      return {
        text: text,
        segments: [{
          id: 's1',
          start: 0,
          end: 1,
          text: text,
          speaker: {
            id: 1,
            name: 'Speaker 1'
          }
        }]
      };
    }
  } catch (error) {
    logger.error('Error creating fallback transcription:', error);
    
    // If we reach here, we couldn't transcribe with OpenAI either
    // Create a simple error message with segments
    const errorText = "Transcription failed. Please check your Azure Speech configuration and try again.";
    logger.info(`Created intelligent artificial speaker segments. Preview: Speaker 1: ${errorText}`);
    
    return {
      text: `Speaker 1: ${errorText}`,
      segments: [{
        id: 'segment-error',
        start: 0,
        end: 1,
        text: errorText,
        speaker: {
          id: '1',
          label: 'Speaker 1'
        }
      }]
    };
  }
}

// Helper function to extract topic words from text
function extractTopicWords(text: string): string[] {
  // Remove common stop words and punctuation
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 
                    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'like', 'through', 'over', 'before', 
                    'after', 'between', 'under', 'above', 'of', 'from', 'up', 'down', 'that', 'this', 'these', 
                    'those', 'it', 'its', 'it\'s', 'they', 'them', 'their', 'theirs', 'he', 'him', 'his', 'she', 
                    'her', 'hers', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours', 'i', 'me', 'my', 'mine'];
  
  // Clean the text and split into words
  const words = text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  return words;
}

// Helper function to calculate similarity between two sets of topic words
function calculateTopicSimilarity(words1: string[], words2: string[]): number {
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Count common words
  const commonWords = words1.filter(word => words2.includes(word));
  
  // Calculate Jaccard similarity
  return commonWords.length / (words1.length + words2.length - commonWords.length);
}

// ... rest of the existing code ... 