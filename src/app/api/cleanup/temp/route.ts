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
import { logger } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    logger.info('POST: Cleaning up old temporary files');
    
    // Get the temp directory
    const tmpDir = path.join(process.cwd(), 'storage', 'tmp');
    
    // Read all files in the temp directory
    const files = await fs.readdir(tmpDir);
    
    // Track deleted files
    let deletedCount = 0;
    
    // Process each file
    for (const file of files) {
      try {
        const filePath = path.join(tmpDir, file);
        const stats = await fs.stat(filePath);
        
        // Calculate file age in hours
        const fileAgeHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
        
        // Delete files older than 24 hours
        if (fileAgeHours > 24) {
          await fs.unlink(filePath);
          logger.info(`Deleted old temporary file: ${file} (${fileAgeHours.toFixed(1)} hours old)`);
          deletedCount++;
        }
      } catch (error) {
        logger.error(`Failed to process temporary file ${file}:`, error);
      }
    }
    
    return NextResponse.json({
      message: `Cleaned up ${deletedCount} old temporary files`,
      deletedCount
    });
  } catch (error) {
    logger.error('Failed to clean up old temporary files:', error);
    return NextResponse.json(
      { error: 'Failed to clean up old temporary files' },
      { status: 500 }
    );
  }
} 