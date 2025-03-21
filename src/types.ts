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

export type SupportedMimeType = 
  | 'audio/mpeg'
  | 'audio/wav'
  | 'audio/x-m4a'
  | 'video/mp4'
  | 'video/quicktime'
  | 'video/x-quicktime'
  | 'application/octet-stream';

export const SUPPORTED_MIME_TYPES: readonly SupportedMimeType[] = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
  'video/mp4',
  'video/quicktime',
  'video/x-quicktime',
  'application/octet-stream', // Some systems use this for MOV files
] as const;

export type FileStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface Speaker {
  id: string;
  label: string;
}

export interface TranscriptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker?: Speaker;
}

export interface FileUpload {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: SupportedMimeType;
  status: FileStatus;
  filePath: string;
  transcription?: string;
  segments?: TranscriptionSegment[];
  speakerIdentification?: boolean;
  useAzureSpeech?: boolean;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deleteAt?: Date;
}