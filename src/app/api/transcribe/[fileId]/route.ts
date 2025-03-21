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
import { promises as fs } from 'fs';
import path from 'path';
import { getFileUpload } from '@/lib/storage';
import { StorageError } from '@/utils/errors';
import { SUPPORTED_MIME_TYPES, FileUpload } from '@/types';
import { cleanupChunks } from '@/utils/audio';
import { transcribeFile } from '@/services/transcription';
import { updateFileStatus } from '@/services/file';
import { logger } from '@/utils/logger';
import { saveFileMetadata } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 1800; // 30 minutes timeout for larger files

export async function POST(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId;
    logger.info(`POST: Starting transcription for file: ${fileId}`);

    // Parse request body for speaker identification preference and Azure Speech option
    let speakerIdentification = false;
    let useAzureSpeech = false;
    try {
      const body = await request.json();
      speakerIdentification = !!body.speakerIdentification;
      useAzureSpeech = !!body.useAzureSpeech;
      
      // When Azure Speech is enabled, always set speakerIdentification to true
      if (useAzureSpeech) {
        speakerIdentification = true;
      }
      
      logger.info(`Speaker identification: ${speakerIdentification ? 'enabled' : 'disabled'}`);
      logger.info(`Azure Speech: ${useAzureSpeech ? 'enabled' : 'disabled'}`);
    } catch (error) {
      // If parsing fails, continue with default (false)
      logger.warn('Failed to parse request body, using default settings (speaker identification and Azure Speech disabled)');
    }

    let file: FileUpload | null;
    try {
      file = await getFileUpload(fileId);
      logger.info('File details:', {
        id: file?.id,
        status: file?.status,
        type: file?.fileType
      });
    } catch (error) {
      logger.error('Error getting file:', error);
      if (error instanceof StorageError) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
      throw error;
    }

    if (!file) {
      logger.error(`File not found: ${fileId}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Update speaker identification and Azure Speech preferences in file metadata
    file.speakerIdentification = speakerIdentification;
    // Add Azure Speech preference to file metadata if needed
    (file as any).useAzureSpeech = useAzureSpeech;
    
    // Save the updated file metadata
    await saveFileMetadata(file);
    logger.info(`Updated file metadata with speakerIdentification: ${speakerIdentification}, useAzureSpeech: ${useAzureSpeech}`);

    // Check if file exists on disk
    try {
      const stats = await fs.stat(file.filePath);
      logger.info('File exists on disk:', {
        path: file.filePath,
        size: stats.size
      });
    } catch (error) {
      logger.error(`File not found on disk: ${file.filePath}`);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // Check if file type is supported
    if (!SUPPORTED_MIME_TYPES.includes(file.fileType)) {
      logger.error(`Unsupported file type: ${file.fileType}`);
      return NextResponse.json(
        { 
          error: 'Unsupported file format',
          supportedFormats: SUPPORTED_MIME_TYPES
        },
        { status: 400 }
      );
    }

    // Start transcription process
    logger.info(`Starting transcription for: ${fileId} with speaker identification: ${speakerIdentification}, Azure Speech: ${useAzureSpeech}`);
    try {
      await transcribeFile(fileId, file.filePath, file.fileType, speakerIdentification, useAzureSpeech);
      return NextResponse.json({ status: 'processing', speakerIdentification, useAzureSpeech });
    } catch (error) {
      logger.error('Failed to start transcription:', error);
      
      // Update file status to error
      await updateFileStatus(fileId, 'error', error instanceof Error ? error.message : 'Failed to start transcription');
      
      return NextResponse.json(
        { 
          error: 'Failed to start transcription', 
          details: error instanceof Error ? error.message : 'Unknown error',
          fileId
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to process transcription request' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId;
    const file = await getFileUpload(fileId);
    logger.info('GET transcription status:', { 
      fileId, 
      status: file?.status, 
      hasTranscription: !!file?.transcription,
      speakerIdentification: file?.speakerIdentification
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(file);
  } catch (error) {
    logger.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId;
    const file = await getFileUpload(fileId);

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Update status to cancelled
    await updateFileStatus(fileId, 'error', 'Transcription cancelled by user');

    return NextResponse.json({ status: 'cancelled' });
  } catch (error) {
    logger.error('Cancel transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel transcription' },
      { status: 500 }
    );
  }
} 