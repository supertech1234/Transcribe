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

import { Inter } from "next/font/google";
import Image from 'next/image';
import "./globals.css";
import { initStorage } from '@/lib/storage';
import { startCleanupService } from '@/lib/cleanup';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Providers } from './providers';
import LogoutButton from '@/components/LogoutButton';

const inter = Inter({ subsets: ["latin"] });

// Initialize storage and cleanup on server start
initStorage().catch(console.error);
startCleanupService();

export const metadata = {
  title: "AI Transcription App",
  description: "Upload and transcribe your media files easily",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gradient-to-b from-gray-50 to-white`}>
        <ErrorBoundary>
          <Providers>
            <div className="min-h-screen flex flex-col">
              <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between h-16">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <Image
                          src="/images/efe-logo.svg"
                          alt="Logo"
                          width={120}
                          height={40}
                          priority
                          className="transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                      <div className="h-6 w-px bg-indigo-100"></div>
                      <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                        AI Transcription
                      </h1>
                    </div>
                    <div className="flex items-center">
                      <LogoutButton />
                    </div>
                  </div>
                </div>
              </header>
              
              <main className="flex-grow py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                      AI-Powered Transcription
                    </h2>
                    <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
                      Convert your audio and video files to text with advanced AI technology.
                      Fast, accurate, and easy to use.
                    </p>
                  </div>
                  
                  {children}
                </div>
              </main>
              
              <footer className="bg-white border-t border-gray-100 py-6 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-sm text-gray-500">
                      &copy; {new Date().getFullYear()} AI Transcription App. All rights reserved.
                    </p>
                    <div className="flex space-x-6">
                      <a href="#" className="text-gray-400 hover:text-indigo-500 transition-colors duration-200">
                        Privacy Policy
                      </a>
                      <a href="#" className="text-gray-400 hover:text-indigo-500 transition-colors duration-200">
                        Terms of Service
                      </a>
                    </div>
                  </div>
                </div>
              </footer>
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
} 