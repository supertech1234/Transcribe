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
import { logger } from '@/utils/logger';

const TEMP_DIR = path.join(process.env.UPLOAD_DIR || './storage/uploads', '../tmp');
const MAX_JOB_AGE_HOURS = 24; // Keep job folders for 24 hours

export async function cleanupOldJobFolders(): Promise<void> {
  try {
    // Ensure the temp directory exists
    try {
      await fs.access(TEMP_DIR);
    } catch (error) {
      logger.warn(`Temp directory does not exist: ${TEMP_DIR}, creating it.`);
      await fs.mkdir(TEMP_DIR, { recursive: true });
      return; // Nothing to clean up yet
    }

    // Read all directories in the temp folder
    const entries = await fs.readdir(TEMP_DIR, { withFileTypes: true });
    const jobFolders = entries.filter(entry => entry.isDirectory());

    const now = Date.now();
    let cleanedCount = 0;
    let errorCount = 0;

    logger.info(`Found ${jobFolders.length} job folders to check for cleanup`);

    for (const folder of jobFolders) {
      const folderPath = path.join(TEMP_DIR, folder.name);
      try {
        // Get folder stats
        const stats = await fs.stat(folderPath);
        const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

        // If folder is older than MAX_JOB_AGE_HOURS, delete it
        if (ageHours > MAX_JOB_AGE_HOURS) {
          await fs.rm(folderPath, { recursive: true, force: true });
          cleanedCount++;
          logger.info(`Cleaned up old job folder: ${folder.name} (age: ${ageHours.toFixed(2)} hours)`);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = (error as NodeJS.ErrnoException).code;
        logger.error(`Error cleaning up job folder ${folder.name} (code: ${errorCode}): ${errorMessage}`);
      }
    }

    logger.info(`Cleanup completed. Removed ${cleanedCount} old job folders. Errors: ${errorCount}.`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as NodeJS.ErrnoException).code;
    logger.error(`Error during job folder cleanup (code: ${errorCode}): ${errorMessage}`);
    throw error;
  }
}

export async function cleanupJobFolder(jobId: string): Promise<void> {
  const jobFolder = path.join(TEMP_DIR, jobId);
  try {
    // First check if it's actually a directory
    try {
      const stats = await fs.stat(jobFolder);
      if (!stats.isDirectory()) {
        logger.warn(`Job folder ${jobId} exists but is not a directory. Attempting to delete as a file.`);
        await fs.unlink(jobFolder);
        logger.info(`Cleaned up job file: ${jobId}`);
        return;
      }
    } catch (statError) {
      if ((statError as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info(`Job folder ${jobId} does not exist, nothing to clean up.`);
        return;
      }
      // Other errors are handled below
    }

    // Use recursive and force options to handle directory deletion
    await fs.rm(jobFolder, { recursive: true, force: true });
    logger.info(`Cleaned up job folder: ${jobId}`);
  } catch (error) {
    logger.error(`Error cleaning up job folder ${jobId}:`, error);
    throw error;
  }
} 