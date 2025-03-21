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


'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileUpload as FileUploadType, SupportedMimeType, TranscriptionSegment, Speaker } from '@/types';
import { validateFile } from '@/utils/validation';
import { LoadingSpinner } from './LoadingSpinner';
import CircularProgress from './CircularProgress';
import { logger } from '@/utils/logger';
import ColoredTranscript from './ColoredTranscript';
import StyledTranscript from './StyledTranscript';

// Add CSS keyframes for the shrinking animation
const shrinkAnimation = `
  @keyframes shrinkBox {
    from {
      max-height: 400px;
      padding: 2.5rem;
    }
    to {
      max-height: 130px;
      padding: 0.75rem;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }

  @keyframes popIn {
    0% { transform: scale(0.8); opacity: 0; }
    70% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes textPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .animate-fadeIn {
    animation: fadeIn 0.5s ease-in-out forwards;
  }

  .animate-fadeIn-delay {
    animation: fadeIn 0.5s ease-in-out 0.2s forwards;
    opacity: 0;
  }

  .animate-text-pulse {
    animation: textPulse 2s ease-in-out infinite;
  }
`;

// Simple formatter for transcription display
const formatTranscription = (text: string, segments?: TranscriptionSegment[], useAzureSpeech?: boolean): string => {
  // Check if the text already contains speaker prefixes (from Azure Speech)
  if (text.includes('Speaker ') && text.includes(': ')) {
    // Text already has speaker prefixes, return it as is
    return text;
  }
  
  // If we have segments with speaker information, use them
  if (segments && segments.length > 0 && segments.some(s => s.speaker)) {
    let formattedText = '';
    let currentSpeakerId = '';

    segments.forEach((segment, index) => {
      // Get speaker info
      const speaker = segment.speaker;
      const speakerName = speaker?.label || `Speaker ${speaker?.id || index + 1}`;
      
      // Add speaker change
      if (speaker && speaker.id !== currentSpeakerId) {
        currentSpeakerId = speaker.id;
        formattedText += `\n\n${speakerName}: ${segment.text.trim()}`;
      } else {
        // Continue with same speaker
        formattedText += `\n${segment.text.trim()}`;
      }
    });

    return formattedText.trim();
  }

  // If Azure Speech is enabled but we don't have proper segments, return the text as is
  // Do not try to add speaker prefixes manually as this would be inaccurate
  if (useAzureSpeech) {
    return text;
  }

  // Otherwise, use standard formatter
  const cleanText = text
    .replace(/\s+/g, ' ')
    .trim();

  // Split into sentences and display each sentence on its own line
  const sentences = cleanText.split(/(?<=[.!?])\s+/);
  
  // Format each sentence on its own line without numbering
  const formattedText = sentences
    .map(sentence => sentence.trim())
    .join('\n\n');

  return formattedText;
};

// Warning popup component for file upload warnings
const FileFormatWarning = ({ message, onClose }: { message: string; onClose: () => void }) => {
  // Determine if this is a multiple files warning or a format warning
  const isMultipleFilesWarning = message.includes('Only one file can be uploaded at a time');
  const title = isMultipleFilesWarning ? 'Multiple Files Detected' : 'Unsupported File Format';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
      <div 
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border-l-4 border-amber-500"
        style={{ animation: 'popIn 0.4s ease-out forwards, shake 0.5s ease-in-out 0.4s' }}
      >
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 mr-3">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
            
            <div className="mt-3 p-3 bg-amber-50 rounded-md">
              <h4 className="text-sm font-medium text-amber-800">Supported Formats:</h4>
              <ul className="mt-1 text-xs text-amber-700 space-y-1 pl-4 list-disc">
                <li>Audio: MP3 (.mp3), WAV (.wav), M4A (.m4a)</li>
                <li>Video: MP4 (.mp4), QuickTime (.mov)</li>
                <li>Maximum file size: 500MB</li>
                <li>Only one file can be uploaded at a time</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

// Add CustomizeSpeakerNames component
const CustomizeSpeakerNames = ({ 
  segments, 
  onSpeakerNamesChange 
}: { 
  segments: TranscriptionSegment[], 
  onSpeakerNamesChange: (speakerMap: Record<string, string>) => void 
}) => {
  // Extract unique speakers from segments
  const uniqueSpeakers = Array.from(
    new Set(segments.filter(s => s.speaker).map(s => s.speaker?.id))
  ).filter(Boolean) as string[];

  // Initialize state with current speaker labels
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>(() => {
    const initialNames: Record<string, string> = {};
    uniqueSpeakers.forEach(speakerId => {
      const speaker = segments.find(s => s.speaker?.id === speakerId)?.speaker;
      initialNames[speakerId] = speaker?.label || `Speaker ${speakerId}`;
    });
    return initialNames;
  });

  // Handle name change for a specific speaker
  const handleNameChange = (speakerId: string, name: string) => {
    const updatedNames = { ...speakerNames, [speakerId]: name };
    setSpeakerNames(updatedNames);
    onSpeakerNamesChange(updatedNames);
  };

  // Only show up to 10 speakers
  const displayedSpeakers = uniqueSpeakers.slice(0, 10);

  // Get the same colors used in the styled transcript
  const getSpeakerColor = (speakerId: string) => {
    const speakerNumber = parseInt(speakerId, 10) || 1;
    const colorIndex = (speakerNumber - 1) % SPEAKER_COLORS.length;
    return SPEAKER_COLORS[colorIndex];
  };
  
  // Import colors from StyledTranscript
  const SPEAKER_COLORS = [
    { border: '#3b82f6', background: '#eff6ff', text: '#3b82f6' }, // blue
    { border: '#10b981', background: '#ecfdf5', text: '#10b981' }, // emerald
    { border: '#f59e0b', background: '#fffbeb', text: '#f59e0b' }, // amber
    { border: '#ec4899', background: '#fdf2f8', text: '#ec4899' }, // pink
    { border: '#6366f1', background: '#eef2ff', text: '#6366f1' }, // indigo
    { border: '#8b5cf6', background: '#f5f3ff', text: '#8b5cf6' }, // violet
    { border: '#f97316', background: '#fff7ed', text: '#f97316' }, // orange
    { border: '#6b7280', background: '#f9fafb', text: '#6b7280' }, // gray
    { border: '#0ea5e9', background: '#f0f9ff', text: '#0ea5e9' }, // sky
    { border: '#14b8a6', background: '#f0fdfa', text: '#14b8a6' }, // teal
  ];

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
          />
        </svg>
        <h3 className="text-xl font-semibold text-gray-900">Customize Speaker Names</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Personalize your transcript by assigning names to each speaker. Changes will be reflected in the transcript and downloads.
      </p>
      
      <div className="space-y-4">
        {displayedSpeakers.map((speakerId) => {
          const colors = getSpeakerColor(speakerId);
          
          return (
            <div key={speakerId} className="flex items-center gap-3">
              <label 
                className="w-24 text-sm font-medium" 
                style={{ color: colors.text }}
              >
                Speaker {speakerId}:
              </label>
              <input
                type="text"
                value={speakerNames[speakerId] || ''}
                onChange={(e) => handleNameChange(speakerId, e.target.value)}
                className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Speaker ${speakerId}`}
                style={{ 
                  border: `2px solid ${colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: colors.background
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<FileUploadType | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState<'txt' | 'docx' | 'srt' | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [speakerIdentification, setSpeakerIdentification] = useState(false);
  const [transcriptionStarted, setTranscriptionStarted] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [formatWarning, setFormatWarning] = useState<string | null>(null);
  const [useAzureSpeech, setUseAzureSpeech] = useState(false);
  // Add state for custom speaker names
  const [customSpeakerNames, setCustomSpeakerNames] = useState<Record<string, string>>({});
  // Add state for transcription start time
  const [transcriptionStartTime, setTranscriptionStartTime] = useState<Date | null>(null);
  // Add state for transcription end time
  const [transcriptionEndTime, setTranscriptionEndTime] = useState<Date | null>(null);

  // Warning animation effect
  useEffect(() => {
    if (transcribing || uploadedFile?.status === 'processing') {
      // Set up the warning animation interval
      const warningInterval = setInterval(() => {
        setWarningVisible(prev => !prev);
      }, 3000); // Toggle every 3 seconds
      
      // Initial visibility
      setWarningVisible(true);
      
      return () => {
        clearInterval(warningInterval);
        setWarningVisible(false);
      };
    }
  }, [transcribing, uploadedFile?.status]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Check if multiple files were dropped
    if (acceptedFiles.length > 1) {
      setFormatWarning('Only one file can be uploaded at a time. Please upload files individually.');
      return;
    }

    const file = acceptedFiles[0];
    const validation = validateFile(file);
    
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setFormatWarning(validation.error || 'Unsupported file format. Please upload MP3, WAV, M4A, MP4, or MOV files.');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);
    setTranscriptionStarted(false);
    setTranscribing(false);
    setUploadedFile(null); // Reset uploaded file state

    // Log file details for large files
    const isVeryLargeFile = file.size > 800 * 1024 * 1024;
    if (isVeryLargeFile) {
      logger.info(`Starting upload of very large file: ${file.name}, Size: ${Math.round(file.size / (1024 * 1024))}MB`);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('speakerIdentification', speakerIdentification.toString());
      
      // Add a flag for very large files
      if (isVeryLargeFile) {
        formData.append('isVeryLargeFile', 'true');
      }

      // Create XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      
      // Set a longer timeout for large files (15 minutes for very large files)
      xhr.timeout = isVeryLargeFile ? 900000 : 600000; // 15 or 10 minutes in milliseconds
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
          
          // Log progress for large files more frequently
          if (isVeryLargeFile && percentComplete % 5 === 0) {
            logger.info(`Very large file upload progress: ${percentComplete}% (${event.loaded} / ${event.total} bytes)`);
          } else if (file.size > 500 * 1024 * 1024 && percentComplete % 10 === 0) {
            logger.info(`Large file upload progress: ${percentComplete}% (${event.loaded} / ${event.total} bytes)`);
          }
        }
      };

      // Create a promise to handle the XHR request
      const response = await new Promise((resolve, reject) => {
        xhr.open('POST', '/api/transcribe', true);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              if (isVeryLargeFile) {
                logger.info(`Very large file upload completed successfully with status: ${xhr.status}`);
              }
              resolve(responseData);
            } catch (error) {
              logger.error('Error parsing response:', error);
              reject(new Error('Invalid response from server'));
            }
          } else {
            logger.error(`Upload failed with status: ${xhr.status}`);
            if (isVeryLargeFile) {
              logger.error(`Very large file upload failed with status: ${xhr.status}, response: ${xhr.responseText}`);
            }
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => {
          logger.error('Network error during upload');
          if (isVeryLargeFile) {
            logger.error('Network error during very large file upload. Check network stability.');
          }
          reject(new Error('Network error during upload. Please check your internet connection and try again.'));
        };
        
        xhr.ontimeout = () => {
          logger.error('Upload timed out');
          if (isVeryLargeFile) {
            logger.error(`Very large file upload timed out after ${xhr.timeout/1000} seconds`);
          }
          reject(new Error('Upload timed out. Please try again or use a smaller file.'));
        };
        
        xhr.onabort = () => {
          logger.error('Upload aborted');
          reject(new Error('Upload was aborted'));
        };
        
        // Send the form data
        try {
          if (isVeryLargeFile) {
            logger.info('Sending very large file data to server...');
          }
          xhr.send(formData);
        } catch (error) {
          logger.error('Error sending form data:', error);
          if (isVeryLargeFile) {
            logger.error('Error sending very large file data:', error);
          }
          reject(new Error('Failed to send upload data'));
        }
      });

      // After successful upload, show transcription progress
      const data = response as any;
      if (data.error) {
        throw new Error(data.error);
      }

      // Create a properly typed FileUpload object
      const fileUpload: FileUploadType = {
        id: data.id,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: file.type as SupportedMimeType,
        filePath: data.filePath || '',
        status: 'pending', // Ensure status is set to pending for new uploads
        transcription: undefined, // Initialize with undefined instead of null
        speakerIdentification,
        uploadedAt: new Date(data.uploadedAt),
        createdAt: new Date(data.uploadedAt),
        updatedAt: new Date(data.uploadedAt)
      };

      logger.info(`File uploaded successfully: ${data.id}, size: ${Math.round(file.size / (1024 * 1024))}MB`);
      setUploadedFile(fileUpload);
      setProgress(100); // Set to 100% to indicate upload is complete
      
      // Do not automatically start transcription
      // Let the user click the Start Transcription button

    } catch (err) {
      logger.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      console.error('Upload error:', err);
      
      if (isVeryLargeFile) {
        logger.error(`Very large file upload error for ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setUploading(false);
    }
  }, [speakerIdentification]);

  // Determine if the upload area should be disabled
  const isUploadDisabled = uploading || transcribing || !!uploadedFile;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploadDisabled,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/x-m4a': ['.m4a'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],  // Add MOV support
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    multiple: false,
    onDropRejected: (fileRejections) => {
      const error = fileRejections[0]?.errors[0];
      if (error?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 500MB');
        setFormatWarning('File is too large. Maximum size is 500MB.');
      } else if (error?.code === 'file-invalid-type') {
        const errorMessage = 'Unsupported file format. Please upload MP3, WAV, M4A, MP4, or MOV files.';
        setError(errorMessage);
        setFormatWarning(errorMessage);
      } else if (error?.code === 'too-many-files') {
        setError('Only one file can be uploaded at a time');
        setFormatWarning('Only one file can be uploaded at a time. Please upload files individually.');
      }
    },
  });

  // Start transcription manually
  const startTranscription = async () => {
    if (!uploadedFile?.id) {
      setError('No file available for transcription');
      return;
    }
    
    setTranscriptionStarted(true);
    setTranscribing(true);
    setProgress(10); // Start at 10% instead of 0%
    setError(null);
    // Set the transcription start time
    setTranscriptionStartTime(new Date());
    
    try {
      await pollTranscriptionStatus(uploadedFile.id);
    } catch (error) {
      setError('Failed to start transcription. Please try again.');
      setTranscribing(false);
      console.error('Transcription start error:', error);
    }
  };

  const pollTranscriptionStatus = async (fileId: string) => {
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    let intervalId: NodeJS.Timeout;

    // Start transcription
    try {
      logger.info(`Starting transcription for file: ${fileId}, using Azure Speech: ${useAzureSpeech}`);
      const response = await fetch(`/api/transcribe/${fileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speakerIdentification: useAzureSpeech ? true : speakerIdentification,
          useAzureSpeech
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to start transcription';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use the raw text
          errorMessage = errorText || errorMessage;
        }
        
        logger.error(`Transcription start error: ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Transcription started:', data);
      
      // Update file status to processing
      setUploadedFile(prev => prev ? {...prev, status: 'processing'} : null);
      setProgress(10); // Start at 10% to show immediate feedback
    } catch (error) {
      console.error('Failed to start transcription:', error);
      setTranscribing(false);
      setError(error instanceof Error ? error.message : 'Failed to start transcription');
      return;
    }

    // Initial quick updates for better UX
    const quickUpdateInterval = setInterval(() => {
      if (attempts < 5) {
        setProgress(prev => Math.min(prev + 3, 20)); // Quick progress to 20%
      }
    }, 1000);

    // Clear quick updates after 5 seconds
    setTimeout(() => {
      clearInterval(quickUpdateInterval);
    }, 5000);

    console.log('Starting polling for file:', fileId);
    const interval = setInterval(async () => {
      try {
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval);
          setError('Transcription timed out');
          setUploadedFile(prev => prev ? {...prev, status: 'error'} : null);
          setTranscribing(false);
          return;
        }

        attempts++;
        const response = await fetch(`/api/transcribe/${fileId}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to check transcription status';
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // If JSON parsing fails, use the raw text
            errorMessage = errorText || errorMessage;
          }
          
          logger.error(`Status check error: ${errorMessage}`);
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Polling response:', data);

        // Calculate progress based on the current phase
        if (data.status === 'pending') {
          // During preparation phase, progress from 20% to 80%
          const baseProgress = 20;
          const preparationProgress = Math.min(
            baseProgress + Math.round((attempts * 3)), 
            80
          );
          console.log('Preparation progress:', preparationProgress + '%');
          setProgress(preparationProgress);
        } else if (data.status === 'processing') {
          // During processing phase, progress from 80% to 95%
          const processingProgress = Math.min(
            80 + Math.round((attempts * 1)), 
            95
          );
          setProgress(processingProgress);
        } else if (data.status === 'completed') {
          setProgress(100);
        }

        if (data.status === 'completed') {
          clearInterval(interval);
          setUploadedFile(data);
          setProgress(100);
          setTranscribing(false);
          // Set the transcription end time when completed
          setTranscriptionEndTime(new Date());
          console.log('Transcription completed:', data);
          
          // Cleanup files after transcription is complete and displayed
          // Wait a short delay to ensure the UI has updated
          setTimeout(() => {
            cleanupFiles(fileId);
          }, 2000);
        } else if (data.status === 'error') {
          clearInterval(interval);
          setError('Transcription failed');
          setTranscribing(false);
          console.log('Transcription failed:', data);
        } else {
          // Update the file status in state
          setUploadedFile(prev => prev ? {...prev, status: data.status} : null);
          const statusText = data.status === 'pending' ? 'Preparing' : 'Processing';
          console.log(`${statusText}...`, `${progress}%`);
        }

        setTranscriptionStatus(data.status);
      } catch (error) {
        console.error('Status check failed:', error);
        clearInterval(interval);
        setError(error instanceof Error ? error.message : 'Failed to check transcription status');
        setTranscribing(false);
      }
    }, 3000); // Poll every 3 seconds for smoother updates

    intervalId = interval;
    return () => {
      clearInterval(quickUpdateInterval);
      clearInterval(intervalId);
    };
  };

  // Function to clean up files after transcription is complete
  const cleanupFiles = async (fileId: string) => {
    try {
      logger.info(`Cleaning up files for: ${fileId}`);
      const response = await fetch(`/api/cleanup/${fileId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(`Cleanup error: ${errorData.error || 'Unknown error'}`);
        return;
      }
      
      const data = await response.json();
      logger.info(`Cleanup completed: ${data.message}`);
      
      // Also clean up any old temporary files
      cleanupOldTempFiles();
    } catch (error) {
      logger.error('Failed to clean up files:', error);
      // Don't show error to user as this is a background operation
    }
  };
  
  // Function to clean up old temporary files
  const cleanupOldTempFiles = async () => {
    try {
      logger.info('Cleaning up old temporary files');
      const response = await fetch('/api/cleanup/temp', {
        method: 'POST',
      });
      
      if (!response.ok) {
        logger.error('Failed to clean up old temporary files');
        return;
      }
      
      const data = await response.json();
      logger.info(`Old temp files cleanup: ${data.message}`);
    } catch (error) {
      logger.error('Failed to clean up old temporary files:', error);
    }
  };

  // Add function to handle speaker name changes
  const handleSpeakerNamesChange = (speakerMap: Record<string, string>) => {
    setCustomSpeakerNames(speakerMap);
    
    // Update the transcription with custom speaker names
    if (uploadedFile?.segments) {
      const updatedSegments = uploadedFile.segments.map(segment => {
        if (segment.speaker && segment.speaker.id in speakerMap) {
          return {
            ...segment,
            speaker: {
              ...segment.speaker,
              label: speakerMap[segment.speaker.id]
            }
          };
        }
        return segment;
      });
      
      setUploadedFile(prev => prev ? {
        ...prev,
        segments: updatedSegments
      } : null);
    }
  };

  // Modify the formatTranscription function to use custom speaker names
  const formatTranscriptionWithCustomNames = (text: string, segments?: TranscriptionSegment[], useAzureSpeech?: boolean): string => {
    // Check if the text already contains speaker prefixes (from Azure Speech)
    if (text.includes('Speaker ') && text.includes(': ')) {
      // Apply custom speaker names to the text
      let formattedText = text;
      Object.entries(customSpeakerNames).forEach(([speakerId, speakerName]) => {
        const regex = new RegExp(`Speaker ${speakerId}:`, 'g');
        formattedText = formattedText.replace(regex, `${speakerName}:`);
      });
      return formattedText;
    }
    
    // If we have segments with speaker information, use them
    if (segments && segments.length > 0 && segments.some(s => s.speaker)) {
      let formattedText = '';
      let currentSpeakerId = '';

      segments.forEach((segment, index) => {
        // Get speaker info
        const speaker = segment.speaker;
        const speakerId = speaker?.id || '';
        const speakerName = customSpeakerNames[speakerId] || speaker?.label || `Speaker ${speakerId || index + 1}`;
        
        // Add speaker change
        if (speaker && speaker.id !== currentSpeakerId) {
          currentSpeakerId = speaker.id;
          formattedText += `\n\n${speakerName}: ${segment.text.trim()}`;
        } else {
          // Continue with same speaker
          formattedText += `\n${segment.text.trim()}`;
        }
      });

      return formattedText.trim();
    }

    // For other cases, use the original formatter
    return formatTranscription(text, segments, useAzureSpeech);
  };

  // Modify the handleDownload function to use custom speaker names
  const handleDownload = async (format: 'txt' | 'docx' | 'srt') => {
    if (!uploadedFile?.transcription) {
      setError('No transcription available to download');
      return;
    }
    
    setDownloadLoading(format); // Set loading state
    
    try {
      // Apply custom speaker names to segments if they exist
      const segmentsWithCustomNames = uploadedFile.segments?.map(segment => {
        if (segment.speaker && segment.speaker.id in customSpeakerNames) {
          return {
            ...segment,
            speaker: {
              ...segment.speaker,
              label: customSpeakerNames[segment.speaker.id]
            }
          };
        }
        return segment;
      });
      
      const response = await fetch(`/api/download/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: uploadedFile.transcription,
          fileName: uploadedFile.fileName || 'transcription',
          segments: segmentsWithCustomNames || uploadedFile.segments,
          speakerIdentification: uploadedFile.speakerIdentification
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Download failed');
      }
      
      // Get the filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const downloadFileName = fileNameMatch?.[1] || `transcription.${format}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setError(error instanceof Error ? error.message : 'Failed to download file');
    } finally {
      setDownloadLoading(null); // Clear loading state
    }
  };

  // Add copy to clipboard functionality
  const handleCopy = async () => {
    if (!uploadedFile?.transcription) return;
    
    try {
      await navigator.clipboard.writeText(uploadedFile.transcription);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      setError('Failed to copy transcription');
    }
  };

  const togglePreview = () => setPreviewExpanded(!previewExpanded);

  // Function to handle starting a new transcription
  const handleStartNew = () => {
    // Refresh the page to start over
    window.location.reload();
  };

  // Function to handle starting over
  const handleStartOver = async () => {
    if (!uploadedFile?.id) return;
    
    try {
      setCleaningUp(true);
      setError(null);
      
      // 1. Clean up files from the current session
      logger.info(`Starting over - force cleaning up files for: ${uploadedFile.id}`);
      
      // Call force cleanup API to remove files regardless of status
      const response = await fetch(`/api/cleanup/force/${uploadedFile.id}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(`Force cleanup error: ${errorData.error || 'Unknown error'}`);
        // Continue with the process even if there's an error
      } else {
        logger.info(`Successfully force cleaned up files for: ${uploadedFile.id}`);
      }
      
      // Also clean up any old temporary files
      try {
        await cleanupOldTempFiles();
      } catch (error) {
        logger.error('Failed to clean up old temporary files:', error);
        // Continue with the process even if there's an error
      }
      
      // Force a small delay to ensure cleanup requests are sent
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 2. Refresh the page
      window.location.reload();
    } catch (error) {
      logger.error('Failed to clean up files during start over:', error);
      // Still refresh the page even if cleanup fails
      window.location.reload();
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (uploadedFile?.transcription) {
        URL.revokeObjectURL(uploadedFile.transcription);
      }
    };
  }, [uploadedFile]);

  // Debug log for transcription data
  useEffect(() => {
    if (uploadedFile?.status === 'completed' && uploadedFile?.transcription) {
      console.log('Transcription data:', {
        text: uploadedFile.transcription,
        segments: uploadedFile.segments,
        speakerIdentification: uploadedFile.speakerIdentification,
        useAzureSpeech: uploadedFile.useAzureSpeech
      });
    }
  }, [uploadedFile]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Format warning popup */}
      {formatWarning && (
        <FileFormatWarning 
          message={formatWarning} 
          onClose={() => setFormatWarning(null)} 
        />
      )}

      {/* Upload Area - Only show if no file is uploaded or hide if transcription is completed */}
      {!uploadedFile?.status || uploadedFile.status !== 'completed' ? (
        <>
          <style jsx>{shrinkAnimation}</style>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl text-center transition-all duration-500 ease-in-out
              ${isDragActive ? 'border-indigo-500 bg-indigo-50/40 shadow-lg' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20 hover:shadow-md'}
              ${isUploadDisabled ? 'opacity-70 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}
              ${uploadedFile ? 'p-4' : 'p-10'}
            `}
            style={{
              animation: uploadedFile ? 'shrinkBox 0.5s ease-in-out forwards' : 'none',
              maxHeight: uploadedFile ? '130px' : '400px',
              overflow: 'hidden'
            }}
          >
            <input {...getInputProps()} disabled={isUploadDisabled} />
            {uploading ? (
              <div className="space-y-6">
                <div className="relative pt-4">
                  <CircularProgress 
                    percentage={progress} 
                    size={80} 
                    strokeWidth={4} 
                    color="#6366F1" 
                  />
                  <p className="absolute inset-0 flex items-center justify-center text-indigo-600 font-semibold">
                    {progress}%
                  </p>
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {progress < 100 ? 
                    'Uploading your file...' : 
                    'Processing transcription...'
                  }
                </p>
              </div>
            ) : isDragActive ? (
              <div className="space-y-4 py-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12" 
                    />
                  </svg>
                </div>
                <p className="text-indigo-600 font-medium text-lg">Drop to start transcribing</p>
              </div>
            ) : (
              <div className={`transition-all duration-500 ease-in-out ${uploadedFile ? 'py-0' : 'py-6'} space-y-2`}>
                {uploadedFile ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                        />
                      </svg>
                      <div className="text-left">
                        <p className="text-sm font-medium text-indigo-600">
                          File uploaded and ready for transcription
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[250px]">
                          {uploadedFile.fileName}
                        </p>
                      </div>
                    </div>
                    
                    {/* Start Over Button - Inside the upload box */}
                    <div className="w-full flex justify-center mt-2.5" style={{ animation: 'fadeIn 0.4s ease-in-out 0.3s forwards', opacity: 0 }}>
                      <button
                        onClick={handleStartOver}
                        disabled={transcribing || cleaningUp}
                        className="px-3.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-md transition-colors duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed border border-amber-200"
                      >
                        <svg className="w-3 h-3 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                          />
                        </svg>
                        {cleaningUp ? 'Cleaning up...' : 'Start Over'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto rounded-full bg-indigo-50 flex items-center justify-center">
                      <svg className="w-10 h-10 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                          d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" 
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium text-lg">
                        Drop your audio/video file here, or <span className="text-indigo-500">browse</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        MP4, MOV, MP3, WAV, M4A up to 500MB
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        When uploading multiple files simultaneously, please note that only one file can be uploaded at a time.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Speaker Identification Toggle - Moved outside the dropzone when file is uploaded */}
      {uploadedFile && !useAzureSpeech && !transcribing && uploadedFile.status !== 'completed' && (
        <div 
          className="mb-4 flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-fadeIn transition-all duration-300"
          style={{
            animation: useAzureSpeech || transcribing ? 'none' : 'fadeIn 0.5s ease-in-out forwards',
            opacity: useAzureSpeech || transcribing ? 0 : 1,
            maxHeight: useAzureSpeech || transcribing ? '0' : '100px',
            overflow: 'hidden',
            marginBottom: useAzureSpeech || transcribing ? 0 : '1rem'
          }}
        >
          <div className="flex-1 flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" 
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-sm text-gray-700 font-medium">Speaker Identification</span>
              <span className="text-xs text-gray-500 text-center">Identifies different speakers in your audio</span>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={speakerIdentification}
              onChange={(e) => setSpeakerIdentification(e.target.checked)}
              disabled={transcribing}
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ED5146] ${transcribing ? 'opacity-50' : ''}`}></div>
          </label>
        </div>
      )}

      {/* Azure Speech Option - Only show when Speaker Identification is enabled and Azure Speech is not yet enabled */}
      {uploadedFile && speakerIdentification && !useAzureSpeech && !transcribing && uploadedFile.status !== 'completed' && (
        <div 
          className="mb-4 flex items-center justify-between bg-white p-4 rounded-lg border border-blue-200 shadow-sm animate-fadeIn-delay transition-all duration-300"
          style={{
            animation: useAzureSpeech || transcribing ? 'none' : 'fadeIn 0.5s ease-in-out 0.2s forwards',
            opacity: useAzureSpeech || transcribing ? 0 : 1,
            maxHeight: useAzureSpeech || transcribing ? '0' : '100px',
            overflow: 'hidden',
            marginBottom: useAzureSpeech || transcribing ? 0 : '1rem'
          }}
        >
          <div className="flex-1 flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                d="M19.11 17.94c1.94-2.06 2.19-5.26.58-7.62L16.5 6.5l-4.58 4.58-4.24-4.24L4.93 9.59c-2.36 1.61-3.14 4.81-1.19 6.87 1.94 2.06 5.15 1.28 6.76-1.08L12 13.5l1.5 1.5c1.61 2.36 4.81 3.14 6.76 1.08" 
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-sm text-gray-700 font-medium">Azure Speech</span>
              <span className="text-xs text-gray-500 text-center">
                Use Azure Cognitive Services for enhanced transcription <span className="font-bold text-red-600 animate-text-pulse">(Longer Processing Time)</span>
              </span>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={useAzureSpeech}
              onChange={(e) => {
                setUseAzureSpeech(e.target.checked);
                // If Azure Speech is being enabled, also enable speaker identification
                if (e.target.checked) {
                  setSpeakerIdentification(true);
                  logger.info('Azure Speech enabled - automatically enabling speaker identification');
                }
              }}
              disabled={transcribing}
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 ${transcribing ? 'opacity-50' : ''}`}></div>
          </label>
        </div>
      )}

      {/* Transcription Result */}
      {uploadedFile && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
          <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                  {uploadedFile.status === 'completed' ? 'Transcription' : 'File Uploaded'}
                </h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                      d="M15 8v8H5V8h10m2-2H3v12" 
                    />
                  </svg>
                  {uploadedFile.fileName}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                        />
                    </svg>
                    <span>{Math.round(uploadedFile.fileSize / 1024 / 1024 * 10) / 10} MB</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <span>Upload Time: {new Date(uploadedFile.uploadedAt).toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Status indicators moved to header area */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Standard button - only show when Speaker Identification is off */}
                  {!speakerIdentification && (
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-md text-yellow-600 text-xs font-medium animate-fadeIn">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                      <span>Standard</span>
                    </div>
                  )}
                  
                  {/* Speaker Identification status */}
                  {speakerIdentification && (
                    <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md text-red-600 text-xs font-medium animate-fadeIn">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                          d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" 
                        />
                      </svg>
                      <span>Speaker Identification</span>
                    </div>
                  )}
                  
                  {/* Azure Speech status */}
                  {useAzureSpeech && (
                    <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-blue-600 text-xs font-medium animate-fadeIn">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                          d="M19.11 17.94c1.94-2.06 2.19-5.26.58-7.62L16.5 6.5l-4.58 4.58-4.24-4.24L4.93 9.59c-2.36 1.61-3.14 4.81-1.19 6.87 1.94 2.06 5.15 1.28 6.76-1.08L12 13.5l1.5 1.5c1.61 2.36 4.81 3.14 6.76 1.08" 
                        />
                      </svg>
                      <span>Azure Speech</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {uploadedFile.status === 'completed' ? (
                  <>
                    <button
                      onClick={handleCopy}
                      className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
                        ${copySuccess 
                          ? 'bg-green-50 text-green-600' 
                          : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                        }`}
                      title="Copy to clipboard"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d={copySuccess 
                            ? "M5 13l4 4L19 7" 
                            : "M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                          } 
                        />
                      </svg>
                      <span className="text-sm font-medium">{copySuccess ? 'Copied!' : 'Copy'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload('txt')}
                        disabled={downloadLoading !== null}
                        className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
                          ${downloadLoading === 'txt' 
                            ? 'bg-indigo-50 text-indigo-400 cursor-wait' 
                            : downloadLoading !== null
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                        title="Download as Text file"
                      >
                        {downloadLoading === 'txt' ? (
                          <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                              />
                            </svg>
                            <span className="text-sm font-medium">TXT</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownload('docx')}
                        disabled={downloadLoading !== null}
                        className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
                          ${downloadLoading === 'docx'
                            ? 'bg-indigo-50 text-indigo-400 cursor-wait'
                            : downloadLoading !== null
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                        title="Download as Word document"
                      >
                        {downloadLoading === 'docx' ? (
                          <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                              />
                            </svg>
                            <span className="text-sm font-medium">DOCX</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownload('srt')}
                        disabled={downloadLoading !== null}
                        className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
                          ${downloadLoading === 'srt'
                            ? 'bg-indigo-50 text-indigo-400 cursor-wait'
                            : downloadLoading !== null
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                        title="Download as SRT subtitle file"
                      >
                        {downloadLoading === 'srt' ? (
                          <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                              />
                            </svg>
                            <span className="text-sm font-medium">SRT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  !transcribing && (
                    <button
                      onClick={startTranscription}
                      disabled={transcribing || uploadedFile.status === 'processing'}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg transition-all duration-200 flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                      <span className="font-medium">Start Transcription</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Transcription Progress */}
            {(transcribing || uploadedFile.status === 'processing') && (
              <>
                {/* Warning Box - Moved to the area between file upload and progress bar */}
                <div 
                  className={`mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md transition-opacity duration-1000 ${warningVisible ? 'opacity-100' : 'opacity-0'}`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Warning: Do not close or refresh this page during transcription.</span>
                  </div>
                </div>

                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Transcription in progress...</span>
                    <span className="text-sm font-medium text-indigo-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}

            {/* Transcription Text */}
            {uploadedFile.status === 'completed' && uploadedFile.transcription && (
              <div className="relative mt-6">
                {uploadedFile.speakerIdentification && uploadedFile.segments && uploadedFile.segments.some(s => s.speaker) ? (
                  <div className="bg-white p-3 rounded-xl border border-gray-100 scrollbar-thin max-h-[32rem] overflow-y-auto">
                    <StyledTranscript 
                      transcription={uploadedFile.transcription}
                      segments={uploadedFile.segments}
                      useAzureSpeech={uploadedFile.useAzureSpeech}
                      customSpeakerNames={customSpeakerNames}
                    />
                  </div>
                ) : (
                  <pre className="text-sm text-gray-700 bg-gray-50 p-6 rounded-xl whitespace-pre-wrap max-h-[32rem] overflow-y-auto font-mono leading-relaxed border border-gray-100 scrollbar-thin">
                    {uploadedFile.transcription ? formatTranscriptionWithCustomNames(
                      uploadedFile.transcription, 
                      uploadedFile.segments,
                      uploadedFile.useAzureSpeech
                    ) : ''}
                  </pre>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
              </div>
            )}
            
            {/* Add Start New Transcription button below the transcription box */}
            {uploadedFile.status === 'completed' && uploadedFile.transcription && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleStartNew}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg transition-all duration-200 flex items-center gap-2 hover:bg-indigo-700 shadow-md"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                  <span className="font-medium">Start New Transcription</span>
                </button>
              </div>
            )}

            {/* File Info - Only show Speaker Identification info */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-500">
              {/* Standard button removed from here */}
            </div>
            
            {/* Separate line for Speaker Identification status (when enabled) - removed from here */}
            
            {/* Separate line for Start Time and End Time */}
            {(transcriptionStartTime || transcriptionEndTime) && (
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 animate-fadeIn">
                {/* Display Start Time if available */}
                {transcriptionStartTime && (
                  <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg text-indigo-600">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                    <span>Start Time: {transcriptionStartTime.toLocaleString()}</span>
                  </div>
                )}
                {/* Display End Time if available */}
                {transcriptionEndTime && uploadedFile.status === 'completed' && (
                  <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg text-indigo-600">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                    <span>End Time: {transcriptionEndTime.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Speaker Name Customization - Only show after transcription is complete and if speaker identification was used */}
      {uploadedFile?.status === 'completed' && 
       uploadedFile.transcription && 
       uploadedFile.speakerIdentification && 
       uploadedFile.segments && 
       uploadedFile.segments.some(s => s.speaker) && (
        <CustomizeSpeakerNames 
          segments={uploadedFile.segments} 
          onSpeakerNamesChange={handleSpeakerNamesChange} 
        />
      )}
    </div>
  );
} 