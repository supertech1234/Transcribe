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
import { getFileUpload } from '@/services/file';
import { createTextFile, createWordDocument } from '@/services/document';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string; format: string } }
) {
  try {
    const { fileId, format } = params;
    const file = await getFileUpload(fileId);

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (!file.transcription) {
      return NextResponse.json(
        { error: 'Transcription not available' },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    switch (format.toLowerCase()) {
      case 'docx':
        buffer = await createWordDocument(file.transcription, file.fileName);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileExtension = 'docx';
        break;
      case 'txt':
      default:
        buffer = await createTextFile(file.transcription);
        contentType = 'text/plain';
        fileExtension = 'txt';
        break;
    }

    // Create a sanitized filename
    const sanitizedFileName = file.fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const downloadFileName = `${sanitizedFileName}_transcription.${fileExtension}`;

    // Return document as downloadable file
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${downloadFileName}"`,
      'Content-Length': buffer.length.toString(),
    });

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download transcription' },
      { status: 500 }
    );
  }
} 