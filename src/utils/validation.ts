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

import { SUPPORTED_MIME_TYPES } from './audio';

// Define the type for accepted file types
type AcceptedFileTypes = {
  [key: string]: string[];
};

// Define the accepted file types
const ACCEPTED_FILE_TYPES: AcceptedFileTypes = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-m4a': ['.m4a'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'application/octet-stream': ['.mov', '.mp3', '.wav', '.mp4', '.m4a'] // For some systems that don't properly set MIME types
};

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check if file type is supported
  const fileType = file.type;
  const extension = file.name.toLowerCase().split('.').pop();
  
  // Check both MIME type and extension
  const isValidType = Object.entries(ACCEPTED_FILE_TYPES).some(([mime, exts]) => 
    fileType === mime || (extension && exts.includes(`.${extension}`))
  );

  if (!isValidType) {
    return {
      valid: false,
      error: 'File type not supported. Please upload MP3, WAV, M4A, MP4, or MOV files.',
    };
  }

  // Check file size (500MB limit)
  const maxSize = 500 * 1024 * 1024; // 500MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 500MB.',
    };
  }

  return { valid: true };
} 