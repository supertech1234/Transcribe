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

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { saveFile, saveFileMetadata, deleteFileMetadata, deleteUploadedFile } from '@/lib/storage';
import { validateFile } from '@/utils/validation';
import { transcribeFile } from '@/services/transcription';
import { logger } from '@/utils/logger';
import type { FileUpload, SupportedMimeType } from '@/types';

// Route Segment Config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 1800; // 30 minutes timeout for larger files
export const preferredRegion = 'auto';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  let savedPath: string | undefined;
  let fileId: string | undefined;

  try {
    // Log the request content type and size
    const contentType = request.headers.get('content-type') || 'unknown';
    const contentLength = request.headers.get('content-length') || 'unknown';
    const contentLengthMB = parseInt(contentLength) / (1024 * 1024);
    const isVeryLargeFile = contentLengthMB > 800;
    
    if (isVeryLargeFile) {
      logger.info(`Processing very large upload request (${Math.round(contentLengthMB)}MB): Content-Type: ${contentType}`);
    } else {
      logger.info(`Processing upload request: Content-Type: ${contentType}, Content-Length: ${contentLength}`);
    }
    
    let formData;
    try {
      formData = await request.formData();
      if (isVeryLargeFile) {
        logger.info('FormData for very large file parsed successfully');
      } else {
        logger.info('FormData parsed successfully');
      }
    } catch (error) {
      logger.error('Error parsing form data:', error);
      if (isVeryLargeFile) {
        logger.error(`Error parsing form data for very large file (${Math.round(contentLengthMB)}MB):`, error);
      }
      return NextResponse.json(
        { error: 'Failed to parse form data. The file may be too large or the request may be malformed.' },
        { status: 400 }
      );
    }
    
    const file = formData.get('file') as File;
    const speakerIdentificationStr = formData.get('speakerIdentification') as string;
    const speakerIdentification = speakerIdentificationStr === 'true';
    const isVeryLargeFileStr = formData.get('isVeryLargeFile') as string;
    const isVeryLargeFileFlag = isVeryLargeFileStr === 'true';
    
    if (!file) {
      logger.error('No file in request');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Log file details
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    if (isVeryLargeFileFlag || fileSizeMB > 800) {
      logger.info(`Very large file received: ${file.name}, Size: ${fileSizeMB}MB, Type: ${file.type}`);
    } else {
      logger.info(`File received: ${file.name}, Size: ${fileSizeMB}MB, Type: ${file.type}`);
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      logger.error(`File validation failed: ${validation.error}`);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Generate a unique file ID and save file
    fileId = uuidv4();
    logger.info(`Generated file ID: ${fileId}`);
    
    // For large files, log progress
    if (file.size > 800 * 1024 * 1024) {
      logger.info(`Processing very large file (${fileSizeMB}MB). Converting to buffer...`);
    } else if (file.size > 500 * 1024 * 1024) {
      logger.info(`Processing large file (${fileSizeMB}MB). Converting to buffer...`);
    }
    
    let buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
      if (file.size > 800 * 1024 * 1024) {
        logger.info(`Very large file converted to buffer: ${buffer.length} bytes`);
      } else {
        logger.info(`File converted to buffer: ${buffer.length} bytes`);
      }
    } catch (error) {
      logger.error('Error converting file to buffer:', error);
      if (file.size > 800 * 1024 * 1024) {
        logger.error(`Error converting very large file (${fileSizeMB}MB) to buffer:`, error);
      }
      return NextResponse.json(
        { error: 'Failed to process file data' },
        { status: 500 }
      );
    }
    
    try {
      if (file.size > 800 * 1024 * 1024) {
        logger.info(`Saving very large file (${fileSizeMB}MB) to disk...`);
      }
      savedPath = await saveFile(buffer, file.name);
      if (file.size > 800 * 1024 * 1024) {
        logger.info(`Very large file saved successfully: ${savedPath}`);
      } else {
        logger.info(`File saved: ${savedPath}`);
      }
    } catch (error) {
      logger.error('Error saving file:', error);
      if (file.size > 800 * 1024 * 1024) {
        logger.error(`Error saving very large file (${fileSizeMB}MB):`, error);
      }
      return NextResponse.json(
        { error: 'Failed to save file to disk' },
        { status: 500 }
      );
    }

    // Create and save initial file metadata
    const fileUpload: FileUpload = {
      id: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type as SupportedMimeType,
      status: 'pending',
      filePath: savedPath,
      speakerIdentification,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await saveFileMetadata(fileUpload);
      if (file.size > 800 * 1024 * 1024) {
        logger.info(`File metadata saved for very large file: ${fileId}`);
      } else {
        logger.info(`File metadata saved for: ${fileId}`);
      }
    } catch (error) {
      logger.error('Error saving file metadata:', error);
      // Clean up the saved file if metadata saving fails
      if (savedPath) {
        await deleteUploadedFile(savedPath).catch(err => 
          logger.error('Error cleaning up uploaded file after metadata save failure:', err)
        );
      }
      return NextResponse.json(
        { error: 'Failed to save file metadata' },
        { status: 500 }
      );
    }

    // Don't transcribe file automatically
    // Just return the file info so the client can start transcription manually
    if (file.size > 800 * 1024 * 1024) {
      logger.info(`Very large file upload completed successfully for file: ${fileId}`);
    } else {
      logger.info(`Upload completed successfully for file: ${fileId}`);
    }
    
    return NextResponse.json({
      id: fileId,
      fileName: file.name,
      fileSize: file.size,
      filePath: savedPath,
      speakerIdentification,
      uploadedAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Upload error:', error);

    // Clean up any saved files and metadata
    if (savedPath) {
      await deleteUploadedFile(savedPath).catch(err => 
        logger.error('Error cleaning up uploaded file:', err)
      );
    }
    
    if (fileId) {
      await deleteFileMetadata(fileId).catch(err => 
        logger.error('Error cleaning up metadata:', err)
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
} 