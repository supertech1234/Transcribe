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

export interface TranscriptionError extends Error {
  code?: string;
  details?: string;
}

export type FileStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';

export const VALID_MIME_TYPES = [
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/x-m4a',
  'video/mp4'
] as const;

export type ValidMimeType = typeof VALID_MIME_TYPES[number];

export const SUPPORTED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/x-m4a',
  'video/mp4',
  'video/quicktime'
] as const;

export type SupportedMimeType = typeof SUPPORTED_MIME_TYPES[number];

export interface FileUpload {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: SupportedMimeType;
  status: FileStatus;
  filePath: string;
  transcription?: string;
  uploadedAt: Date;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
  deleteAt?: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
} 