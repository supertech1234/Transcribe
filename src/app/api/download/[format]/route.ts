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
import { createTextFile, createWordDocument, createSrtFile } from '@/services/document';
import { logger } from '@/utils/logger';
import { TranscriptionSegment } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const preferredRegion = 'auto';

export async function POST(
  request: NextRequest,
  { params }: { params: { format: string } }
) {
  try {
    const { format } = params;
    
    // Parse JSON with error handling
    const body = await request.json().catch(() => ({}));
    const { 
      text, 
      fileName = 'transcription', 
      segments = [], 
      speakerIdentification = false 
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    logger.info(`Creating ${format} file with speaker identification: ${speakerIdentification}`);

    let buffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    switch (format.toLowerCase()) {
      case 'docx':
        buffer = await createWordDocument(text, fileName, segments, speakerIdentification);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileExtension = 'docx';
        break;
      case 'srt':
        buffer = await createSrtFile(text, segments, speakerIdentification);
        contentType = 'text/plain';
        fileExtension = 'srt';
        break;
      case 'txt':
      default:
        buffer = await createTextFile(text, segments, speakerIdentification);
        contentType = 'text/plain';
        fileExtension = 'txt';
        break;
    }

    // Create a sanitized filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const downloadFileName = `${sanitizedFileName}_transcription${speakerIdentification ? '_with_speakers' : ''}.${fileExtension}`;

    // Return document as downloadable file
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${downloadFileName}"`,
      'Content-Length': buffer.length.toString(),
      // Add cache control to prevent caching
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return new NextResponse(buffer, { headers });
  } catch (error) {
    logger.error('Download error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to download transcription'
      },
      { status: 500 }
    );
  }
} 