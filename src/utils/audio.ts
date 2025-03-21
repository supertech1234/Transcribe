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

// Client-side only code - no server imports
export const SUPPORTED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
  'video/mp4',
  'video/quicktime',
  'video/x-quicktime',
  'application/octet-stream', // Some systems use this for MOV files
] as const;

export const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.mp4', '.mov', '.m4a'];

export function isAudioFormatSupported(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType as any);
}

export function isVideoFile(mimeType: string, fileName?: string): boolean {
  return mimeType.startsWith('video/') || 
         (mimeType === 'application/octet-stream' && fileName ? fileName.toLowerCase().endsWith('.mov') : false);
}

export type ValidMimeType = typeof SUPPORTED_MIME_TYPES[number];

import { createReadStream, createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function chunk(filePath: string, chunkSize: number): Promise<string[]> {
  const tempDir = path.join(process.cwd(), 'tmp');
  await fs.mkdir(tempDir, { recursive: true });

  const fileSize = (await fs.stat(filePath)).size;
  const chunks: string[] = [];
  const numberOfChunks = Math.ceil(fileSize / chunkSize);

  for (let i = 0; i < numberOfChunks; i++) {
    const chunkPath = path.join(tempDir, `${uuidv4()}.chunk`);
    const writeStream = createWriteStream(chunkPath);
    const readStream = createReadStream(filePath, {
      start: i * chunkSize,
      end: Math.min((i + 1) * chunkSize - 1, fileSize - 1)
    });

    await new Promise<void>((resolve, reject) => {
      readStream.pipe(writeStream)
        .on('finish', () => resolve())
        .on('error', reject);
    });

    chunks.push(chunkPath);
  }

  return chunks;
}

// Cleanup function to remove temporary chunks
export async function cleanupChunks(chunks: string[]) {
  for (const chunk of chunks) {
    try {
      await fs.unlink(chunk);
    } catch (error) {
      console.error('Error cleaning up chunk:', error);
    }
  }
} 