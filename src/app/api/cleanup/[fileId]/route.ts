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
import { getFileUpload, deleteFileMetadata, deleteUploadedFile } from '@/lib/storage';
import { logger } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId;
    logger.info(`POST: Cleaning up files for: ${fileId}`);

    // Get file metadata
    const file = await getFileUpload(fileId);
    
    if (!file) {
      logger.error(`File not found for cleanup: ${fileId}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Store the transcription text before deleting the metadata
    const transcriptionText = file.transcription;
    const fileName = file.fileName;
    const fileStatus = file.status;
    
    // Log the cleanup request details
    logger.info(`Cleaning up file: ${fileId}, status: ${fileStatus}, fileName: ${fileName}`);
    
    // Delete the original file
    if (file.filePath) {
      try {
        await deleteUploadedFile(file.filePath);
        logger.info(`Deleted original file: ${file.filePath}`);
      } catch (error) {
        logger.error(`Failed to delete original file: ${file.filePath}`, error);
      }
    }

    // Delete metadata file
    try {
      await deleteFileMetadata(fileId);
      logger.info(`Deleted metadata for file: ${fileId}`);
    } catch (error) {
      logger.error(`Failed to delete metadata for file: ${fileId}`, error);
    }

    // Clean up any temporary files in the tmp directory
    try {
      const tmpDir = path.join(process.cwd(), 'storage', 'tmp');
      const jobFolder = path.join(tmpDir, fileId);

      // First try to delete the job folder if it exists
      try {
        const folderStat = await fs.stat(jobFolder);
        if (folderStat.isDirectory()) {
          await fs.rm(jobFolder, { recursive: true, force: true });
          logger.info(`Deleted job folder: ${fileId}`);
        }
      } catch (error) {
        // If folder doesn't exist or can't be deleted, fall back to individual file cleanup
        logger.info(`Job folder not found or couldn't be deleted, falling back to file cleanup`);
      }

      // Check for any other temporary files that might need cleanup
      const files = await fs.readdir(tmpDir);
      
      // Get the base filename without extension
      const baseFileName = file.fileName ? path.basename(file.fileName, path.extname(file.fileName)) : '';
      const fileIdParts = fileId.split('-');
      
      // First filter based on filename patterns
      let relatedFiles = files.filter(f => {
        // Skip the fileId directory as we already tried to delete it
        if (f === fileId) return false;
        
        // Check for fileId match
        if (f.includes(fileId)) return true;
        
        // Check for parts of the fileId (UUID parts)
        if (fileIdParts.some(part => part.length > 5 && f.includes(part))) return true;
        
        // Check for base filename match
        if (baseFileName && f.includes(baseFileName)) return true;
        
        // Check for file path match
        if (file.filePath && f.includes(path.basename(file.filePath))) return true;
        
        // Check for common temp file extensions
        if (f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.chunk')) return true;
        
        return false;
      });
      
      // For remaining files, check their creation time
      if (relatedFiles.length === 0) {
        // If no files were found by name, try to find recent temp files
        const recentFiles = [];
        
        for (const f of files) {
          if (f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.chunk')) {
            try {
              const fileStat = await fs.stat(path.join(tmpDir, f));
              const fileAge = Date.now() - fileStat.mtimeMs;
              
              // If file is less than 1 hour old
              if (fileAge < 3600000) {
                recentFiles.push(f);
              }
            } catch (err) {
              // Ignore stat errors
            }
          }
        }
        
        relatedFiles = recentFiles;
      }
      
      logger.info(`Found ${relatedFiles.length} temporary files to clean up`);
      
      for (const relatedFile of relatedFiles) {
        try {
          await fs.unlink(path.join(tmpDir, relatedFile));
          logger.info(`Deleted temporary file: ${relatedFile}`);
        } catch (error) {
          logger.error(`Failed to delete temporary file: ${relatedFile}`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to clean up temporary directory', error);
    }

    return NextResponse.json({
      message: 'Cleanup completed successfully',
      fileId,
      fileName
    });
  } catch (error) {
    logger.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to clean up files' },
      { status: 500 }
    );
  }
} 