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
import { getFileUpload, deleteFileUpload } from '@/services/file';
import { deleteFile } from '@/utils/file';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId;
    const file = await getFileUpload(fileId);
    console.log('Download request:', { fileId, status: file?.status, hasTranscription: !!file?.transcription });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (!file.transcription) {
      console.error('No transcription available for file:', fileId);
      return NextResponse.json(
        { error: 'Transcription not available' },
        { status: 400 }
      );
    }

    // Create text file with transcription
    const transcriptionText = file.transcription;
    const blob = new Blob([transcriptionText], { type: 'text/plain' });

    // Delete the file and metadata after preparing download
    try {
      await Promise.all([
        deleteFile(file.filePath),
        deleteFileUpload(fileId)
      ]);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue with download even if deletion fails
    }

    // Return transcription as downloadable file
    const headers = new Headers({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${file.fileName}.txt"`,
    });

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download transcription' },
      { status: 500 }
    );
  }
} 