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

import { cleanupOldFiles } from '@/utils/cleanup';

let cleanupInterval: NodeJS.Timeout;

export function startCleanupService() {
  // Only start if cleanup is enabled
  if (process.env.CLEANUP_ENABLED !== 'true') {
    console.log('Cleanup service is disabled');
    return;
  }

  // Get interval from environment or default to 60 minutes
  const intervalMinutes = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60', 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`Starting cleanup service with ${intervalMinutes} minute interval`);

  // Run initial cleanup
  cleanupOldFiles().catch(console.error);

  // Schedule regular cleanup
  cleanupInterval = setInterval(async () => {
    try {
      await cleanupOldFiles();
    } catch (error) {
      console.error('Error in cleanup interval:', error);
    }
  }, intervalMs);
  
  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down cleanup service');
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
    cleanupOldFiles().catch(console.error);
  });

  // Also cleanup on unhandled rejections
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise rejection:', reason);
    cleanupOldFiles().catch(console.error);
  });
}

export function stopCleanupService() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    console.log('Cleanup service stopped');
  }
} 