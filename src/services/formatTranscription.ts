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

interface Speaker {
  id: string;
  name?: string;
  label?: string;
}

interface TranscriptionSegment {
  speaker?: Speaker;
  text: string;
  timestamp?: string;
  confidence?: number;
  start?: number;
  end?: number;
}

interface DocumentFormat {
  text: string;
  fileName: string;
  timestamp: string;
  segments?: TranscriptionSegment[];
  speakerIdentification?: boolean;
}

export function formatTranscription(text: string, segments?: TranscriptionSegment[]): string {
  // If we have segments with speaker information, use the specialized formatter
  if (segments && segments.length > 0 && segments.some(s => s.speaker)) {
    return formatSpeakerTranscription(segments);
  }

  // Otherwise, use the standard formatter
  // First, clean up the text
  const cleanText = text
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .trim();

  // Split into sentences (basic sentence detection)
  const sentences = cleanText.split(/(?<=[.!?])\s+/);
  
  // Format each sentence on its own line without numbering
  const formattedText = sentences
    .map(sentence => sentence.trim())
    .join('\n\n');

  return formattedText;
}

export function formatSpeakerTranscription(segments: TranscriptionSegment[]): string {
  let formattedText = '';
  let currentSpeakerId = '';

  segments.forEach((segment, index) => {
    // Get speaker info
    const speaker = segment.speaker;
    const speakerName = speaker?.name || speaker?.label || `Speaker ${speaker?.id || index}`;
    
    // Add speaker change
    if (speaker && speaker.id !== currentSpeakerId) {
      currentSpeakerId = speaker.id;
      formattedText += `\n\n${speakerName}:\n`;
    }

    // Add timestamp if available
    const timestamp = segment.start !== undefined && segment.end !== undefined 
      ? `[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}] ` 
      : '';
    
    // Add segment text with timestamp
    formattedText += `${timestamp}${segment.text.trim()}\n`;
  });

  return formattedText.trim();
}

export function formatTimestampedTranscription(segments: TranscriptionSegment[]): string {
  let formattedText = '';
  let currentSpeaker = '';

  segments.forEach((segment, index) => {
    // Add timestamp if available
    const timestamp = segment.timestamp 
      ? `[${segment.timestamp}] ` 
      : segment.start !== undefined 
        ? `[${formatTimestamp(segment.start)}] ` 
        : '';
    
    // Add speaker change
    if (segment.speaker?.name && segment.speaker.name !== currentSpeaker) {
      currentSpeaker = segment.speaker.name;
      formattedText += `\n\n${currentSpeaker}:\n`;
    }

    // Add segment text with timestamp
    formattedText += `${timestamp}${segment.text}\n`;
  });

  return formattedText.trim();
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function formatWordDocument(data: DocumentFormat): {
  title: string;
  metadata: Record<string, string>;
  content: string;
} {
  return {
    title: 'Transcription',
    metadata: {
      'File Name': data.fileName,
      'Created': new Date(data.timestamp).toLocaleString(),
      'Word Count': data.text.split(/\s+/).length.toString(),
      'Characters': data.text.length.toString(),
      'Paragraphs': data.text.split(/\n\n+/).length.toString(),
      'Speaker Identification': data.speakerIdentification ? 'Enabled' : 'Disabled',
    },
    content: data.segments && data.speakerIdentification 
      ? formatSpeakerTranscription(data.segments) 
      : formatTranscription(data.text)
  };
} 