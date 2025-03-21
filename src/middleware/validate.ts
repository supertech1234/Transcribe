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

export function validateRequest(request: NextRequest) {
  // Only validate content type for upload endpoint
  if (request.nextUrl.pathname === '/api/upload') {
    const contentType = request.headers.get('content-type') || '';
    // Check if it's a multipart form data request and starts with the correct content type
    if (!contentType.startsWith('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }
  }

  // Validate file size - 500MB limit
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > 500 * 1024 * 1024) { // 500MB
    return NextResponse.json(
      { error: 'File too large. Maximum size is 500MB' },
      { status: 413 }
    );
  }

  return null;
} 