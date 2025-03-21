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
import path from 'path';
import { saveFileMetadata } from '@/lib/storage';
import { SUPPORTED_MIME_TYPES, FileUpload, SupportedMimeType } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 900; // 15 minutes timeout for larger files

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type with proper type checking
    if (!SUPPORTED_MIME_TYPES.includes(file.type as SupportedMimeType)) {
      return NextResponse.json(
        { 
          error: 'Unsupported file format',
          supportedFormats: SUPPORTED_MIME_TYPES 
        },
        { status: 400 }
      );
    }

    const fileType = file.type as SupportedMimeType;

    // Generate unique ID and file path
    const fileId = uuidv4();
    const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
    const filePath = path.join(uploadDir, `${fileId}-${file.name}`);

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Create file metadata
    const fileUpload: FileUpload = {
      id: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType,
      status: 'pending',
      filePath,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save metadata
    await saveFileMetadata(fileUpload);

    return NextResponse.json({
      id: fileId,
      fileName: file.name,
      status: 'pending'
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request aborted' },
        { status: 499 }
      );
    }
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 