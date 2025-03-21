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

import { TranscriptionSegment } from '@/types';
import React from 'react';

interface ColoredTranscriptProps {
  transcription: string;
  segments?: TranscriptionSegment[];
  useAzureSpeech?: boolean;
  customSpeakerNames?: Record<string, string>;
}

// Define color palette for speakers
const SPEAKER_COLORS = {
  1: { border: '#3b82f6', background: '#eff6ff', text: '#3b82f6' }, // blue
  2: { border: '#10b981', background: '#ecfdf5', text: '#10b981' }, // emerald
  3: { border: '#f59e0b', background: '#fffbeb', text: '#f59e0b' }, // amber
  4: { border: '#ec4899', background: '#fdf2f8', text: '#ec4899' }, // pink
  5: { border: '#6366f1', background: '#eef2ff', text: '#6366f1' }, // indigo
  6: { border: '#8b5cf6', background: '#f5f3ff', text: '#8b5cf6' }, // violet
  7: { border: '#f97316', background: '#fff7ed', text: '#f97316' }, // orange
  8: { border: '#6b7280', background: '#f9fafb', text: '#6b7280' }, // gray
  9: { border: '#0ea5e9', background: '#f0f9ff', text: '#0ea5e9' }, // sky
  10: { border: '#14b8a6', background: '#f0fdfa', text: '#14b8a6' }, // teal
};

const ColoredTranscript: React.FC<ColoredTranscriptProps> = ({
  transcription,
  segments,
  useAzureSpeech,
  customSpeakerNames = {}
}) => {
  // If no speaker identification or segments are available, return plain text
  if (!segments || segments.length === 0 || !segments.some(s => s.speaker)) {
    return <pre className="whitespace-pre-wrap">{transcription}</pre>;
  }

  // Group segments by speaker
  const speakerGroups: {
    speakerId: string;
    speakerName: string;
    text: string[];
  }[] = [];

  let currentSpeakerId = '';
  let currentGroupIndex = -1;

  segments.forEach((segment, index) => {
    // Skip segments without speaker info
    if (!segment.speaker) return;

    const speakerId = segment.speaker.id || `unknown-${index}`;
    const speakerName = customSpeakerNames[speakerId] || 
                        segment.speaker.label || 
                        `Speaker ${speakerId || index + 1}`;
    
    // If this is a new speaker, create a new group
    if (speakerId !== currentSpeakerId) {
      currentSpeakerId = speakerId;
      currentGroupIndex++;
      speakerGroups.push({
        speakerId,
        speakerName,
        text: [segment.text.trim()]
      });
    } else {
      // Add to existing group
      speakerGroups[currentGroupIndex].text.push(segment.text.trim());
    }
  });

  // Create speaker color mapping
  const speakerColors = new Map<string, number>();
  let colorCounter = 1;

  speakerGroups.forEach(group => {
    if (!speakerColors.has(group.speakerId)) {
      speakerColors.set(group.speakerId, colorCounter);
      colorCounter = colorCounter % 10 + 1; // Cycle through 10 colors
    }
  });

  return (
    <div className="space-y-4">
      {speakerGroups.map((group, groupIndex) => {
        const colorIndex = speakerColors.get(group.speakerId) || 1;
        const colors = SPEAKER_COLORS[colorIndex as keyof typeof SPEAKER_COLORS];
        
        return (
          <div 
            key={`${group.speakerId}-${groupIndex}`} 
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '0.75rem',
              position: 'relative',
              border: `2px solid ${colors.border}`,
              borderRadius: '0.25rem',
              backgroundColor: colors.background
            }}
          >
            <div 
              style={{
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: colors.text
              }}
            >
              {group.speakerName}
            </div>
            <div className="text-gray-800">
              {group.text.map((text, i) => (
                <p key={i} className="mb-1">
                  {text}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ColoredTranscript; 