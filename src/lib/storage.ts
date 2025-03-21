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

import { promises as fs } from 'fs';
import path from 'path';
import { FileUpload } from '@/types';
import { StorageError } from '@/utils/errors';
import { retry } from '@/utils/retry';

// Define storage paths relative to project root
const STORAGE_DIR = path.join(process.cwd(), 'storage');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
const METADATA_DIR = path.join(STORAGE_DIR, 'metadata');
const TMP_DIR = path.join(STORAGE_DIR, 'tmp');

// Initialize required directories
async function initDirectories() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(METADATA_DIR, { recursive: true });
    await fs.mkdir(TMP_DIR, { recursive: true });
    console.log('Storage directories initialized:', { STORAGE_DIR, UPLOADS_DIR, METADATA_DIR, TMP_DIR });
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
}

// Initialize directories when module loads
initDirectories().catch(console.error);

// Add error handling for storage initialization
export async function initStorage() {
  try {
    await fs.mkdir(METADATA_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    throw new StorageError(
      'Failed to initialize storage',
      'INIT',
      error
    );
  }
}

// Add validation for file metadata
export async function saveFileMetadata(file: FileUpload): Promise<void> {
  const filePath = path.join(METADATA_DIR, `${file.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(file, null, 2));
  console.log(`Metadata saved for file: ${file.id}`);
}

// Get file metadata
export async function getFileMetadata(fileId: string): Promise<FileUpload | null> {
  try {
    const filePath = path.join(METADATA_DIR, `${fileId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data) as FileUpload;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

// Add the missing export
export async function getFileUpload(fileId: string): Promise<FileUpload | null> {
  try {
    const filePath = path.join(METADATA_DIR, `${fileId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data) as FileUpload;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

// Update file status
export async function updateFileStatus(
  fileId: string,
  status: FileUpload['status'],
  transcription?: string,
  segments?: any[]
): Promise<void> {
  const file = await getFileUpload(fileId);
  if (!file) {
    console.error(`File not found for status update: ${fileId}`);
    throw new StorageError('File not found', 'UPDATE_STATUS', { fileId });
  }

  const updatedFile = {
    ...file,
    status,
    transcription: transcription || file.transcription,
    segments: segments || file.segments,
    updatedAt: new Date()
  };

  await saveFileMetadata(updatedFile);
  console.log(`Status updated for file ${fileId}: ${status}`);

  // We're removing the automatic cleanup to allow manual transcription
  // Files will be cleaned up by a separate process or on application shutdown
}

// Delete file and metadata
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw error if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function saveFile(buffer: Buffer, originalName: string): Promise<string> {
  const fileName = `${Date.now()}-${originalName}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  
  try {
    // For large files, log the process
    const isVeryLargeFile = buffer.length > 800 * 1024 * 1024;
    const fileSizeMB = Math.round(buffer.length / (1024 * 1024));
    
    if (isVeryLargeFile) {
      console.log(`Writing very large file (${fileSizeMB}MB) to disk: ${filePath}`);
    } else if (buffer.length > 500 * 1024 * 1024) {
      console.log(`Writing large file (${fileSizeMB}MB) to disk: ${filePath}`);
    }
    
    // Use writeFile with retry for large files
    // Increase retry attempts and delay for very large files
    let retryAttempt = 0;
    await retry(
      async () => {
        try {
          await fs.writeFile(filePath, buffer);
          retryAttempt++;
          if (isVeryLargeFile && retryAttempt > 1) {
            console.log(`Retry attempt ${retryAttempt} succeeded for very large file (${fileSizeMB}MB): ${filePath}`);
          }
        } catch (error) {
          if (isVeryLargeFile) {
            console.log(`Retry attempt ${retryAttempt + 1} for very large file (${fileSizeMB}MB): ${filePath}`);
          }
          throw error;
        }
      },
      {
        maxAttempts: isVeryLargeFile ? 5 : 3,
        delay: isVeryLargeFile ? 2000 : 1000,
        backoff: isVeryLargeFile ? 3 : 2
      }
    );
    
    if (isVeryLargeFile) {
      console.log(`Very large file saved successfully: ${filePath}`);
    } else {
      console.log(`File saved: ${filePath}`);
    }
    return filePath;
  } catch (error) {
    console.error('Error saving file:', error);
    if (buffer.length > 800 * 1024 * 1024) {
      console.error(`Error saving very large file (${Math.round(buffer.length / (1024 * 1024))}MB):`, error);
      
      // Try to clean up any partial file
      try {
        await fs.unlink(filePath).catch(() => {});
        console.log(`Cleaned up partial very large file: ${filePath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up partial file:', cleanupError);
      }
    }
    throw new StorageError(
      'Failed to save file',
      'SAVE_FILE',
      { fileName: originalName, error }
    );
  }
}

export async function deleteFileMetadata(fileId: string): Promise<void> {
  const filePath = path.join(METADATA_DIR, `${fileId}.json`);
  try {
    await fs.unlink(filePath);
    console.log(`Metadata deleted for file: ${fileId}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    console.log(`Uploaded file deleted: ${filePath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
} 