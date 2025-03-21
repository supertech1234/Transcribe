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

import { getFileMetadata, deleteFile } from '@/lib/storage';
import fs from 'fs/promises';
import path from 'path';
import { StorageError } from './errors';
import minimatch from 'minimatch';

const STORAGE_DIR = path.join(process.cwd(), 'storage');

// Get cleanup configuration from environment variables
const CLEANUP_ENABLED = process.env.CLEANUP_ENABLED === 'true';
const CLEANUP_FILE_AGE_MINUTES = parseInt(process.env.CLEANUP_FILE_AGE_MINUTES || '120', 10);
const CLEANUP_DIRECTORIES = (process.env.CLEANUP_DIRECTORIES || 'storage/tmp,storage/metadata,storage/uploads').split(',');
const CLEANUP_EXCLUDE_PATTERNS = (process.env.CLEANUP_EXCLUDE_PATTERNS || '*.keep,*.gitkeep').split(',');

export async function cleanupOldFiles() {
  if (!CLEANUP_ENABLED) {
    console.log('Cleanup is disabled');
    return;
  }

  try {
    const cleanupPromises = [];

    // Process each configured directory
    for (const dir of CLEANUP_DIRECTORIES) {
      const fullPath = path.join(process.cwd(), dir);
      
      try {
        const files = await fs.readdir(fullPath);
        const now = Date.now();
        const ageThreshold = now - (CLEANUP_FILE_AGE_MINUTES * 60 * 1000);

        for (const file of files) {
          // Skip excluded files
          const shouldExclude = CLEANUP_EXCLUDE_PATTERNS.some(pattern => {
            try {
              return minimatch(file, pattern);
            } catch (error) {
              console.error(`Error matching pattern ${pattern} against file ${file}:`, error);
              return false;
            }
          });

          if (shouldExclude) {
            console.log(`Skipping excluded file: ${file}`);
            continue;
          }

          const filePath = path.join(fullPath, file);
          try {
            const stats = await fs.stat(filePath);

            // Check if file is older than threshold
            if (stats.mtimeMs < ageThreshold) {
              console.log(`Scheduling deletion of old file: ${filePath}`);
              cleanupPromises.push(
                fs.unlink(filePath).catch(error => {
                  console.error(`Failed to delete file ${filePath}:`, error);
                })
              );
            }
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${fullPath}:`, error);
      }
    }

    await Promise.all(cleanupPromises);
    console.log(`Cleanup completed at ${new Date().toISOString()}`);
  } catch (error) {
    if (error instanceof StorageError) {
      console.error('Storage error during cleanup:', error);
      return;
    }
    console.error('Cleanup error:', error);
  }
} 