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

interface StyledTranscriptProps {
  transcription: string;
  segments?: TranscriptionSegment[];
  useAzureSpeech?: boolean;
  customSpeakerNames?: Record<string, string>;
}

// Color palette for speakers
const SPEAKER_COLORS = [
  { border: '#3b82f6', background: '#eff6ff', text: '#3b82f6' }, // blue
  { border: '#10b981', background: '#ecfdf5', text: '#10b981' }, // emerald
  { border: '#f59e0b', background: '#fffbeb', text: '#f59e0b' }, // amber
  { border: '#ec4899', background: '#fdf2f8', text: '#ec4899' }, // pink
  { border: '#6366f1', background: '#eef2ff', text: '#6366f1' }, // indigo
  { border: '#8b5cf6', background: '#f5f3ff', text: '#8b5cf6' }, // violet
  { border: '#f97316', background: '#fff7ed', text: '#f97316' }, // orange
  { border: '#6b7280', background: '#f9fafb', text: '#6b7280' }, // gray
  { border: '#0ea5e9', background: '#f0f9ff', text: '#0ea5e9' }, // sky
  { border: '#14b8a6', background: '#f0fdfa', text: '#14b8a6' }, // teal
];

const StyledTranscript: React.FC<StyledTranscriptProps> = ({
  transcription,
  segments,
  useAzureSpeech,
  customSpeakerNames = {}
}) => {
  // Parse the transcription if we don't have segments but have text with speaker prefixes
  if (!segments || segments.length === 0) {
    if (transcription.includes('Speaker ') && transcription.includes(': ')) {
      // Simple parsing to extract speakers and their text
      const lines = transcription.split('\n');
      const parsedGroups: { speakerId: string, speakerName: string, text: string[] }[] = [];
      
      let currentSpeaker = '';
      let currentText: string[] = [];
      
      lines.forEach(line => {
        const speakerMatch = line.match(/^Speaker (\d+): (.*)/);
        if (speakerMatch) {
          // If there was a previous speaker, save their group
          if (currentSpeaker && currentText.length > 0) {
            parsedGroups.push({
              speakerId: currentSpeaker,
              speakerName: `Speaker ${currentSpeaker}`,
              text: [...currentText]
            });
            currentText = [];
          }
          
          // Start new speaker group
          currentSpeaker = speakerMatch[1];
          if (speakerMatch[2].trim()) {
            currentText.push(speakerMatch[2].trim());
          }
        } else if (line.trim() && currentSpeaker) {
          // Add to current speaker's text
          currentText.push(line.trim());
        }
      });
      
      // Add the last speaker group if there is one
      if (currentSpeaker && currentText.length > 0) {
        parsedGroups.push({
          speakerId: currentSpeaker,
          speakerName: `Speaker ${currentSpeaker}`,
          text: [...currentText]
        });
      }
      
      // Generate the styled transcript
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {parsedGroups.map((group, index) => {
            const speakerNumber = parseInt(group.speakerId, 10) || 1;
            const colorIndex = (speakerNumber - 1) % SPEAKER_COLORS.length;
            const colors = SPEAKER_COLORS[colorIndex];
            
            return (
              <div 
                key={`parsed-${group.speakerId}-${index}`}
                style={{
                  padding: '12px 16px',
                  marginBottom: '12px',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: colors.background
                }}
              >
                <div 
                  style={{
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: colors.text
                  }}
                >
                  {customSpeakerNames[group.speakerId] || group.speakerName}
                </div>
                <div>
                  {group.text.map((text, i) => (
                    <p key={i} style={{ marginBottom: '4px', color: '#1f2937' }}>
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    // If no speaker detection, return plain text
    return <pre style={{ whiteSpace: 'pre-wrap' }}>{transcription}</pre>;
  }
  
  // Process with segments (standard way)
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
  let colorCounter = 0;

  speakerGroups.forEach(group => {
    if (!speakerColors.has(group.speakerId)) {
      speakerColors.set(group.speakerId, colorCounter);
      colorCounter = (colorCounter + 1) % SPEAKER_COLORS.length;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {speakerGroups.map((group, groupIndex) => {
        const colorIndex = speakerColors.get(group.speakerId) || 0;
        const colors = SPEAKER_COLORS[colorIndex];
        
        return (
          <div 
            key={`${group.speakerId}-${groupIndex}`}
            style={{
              padding: '12px 16px',
              marginBottom: '12px',
              border: `2px solid ${colors.border}`,
              borderRadius: '4px',
              backgroundColor: colors.background
            }}
          >
            <div 
              style={{
                fontWeight: 600,
                marginBottom: '8px',
                color: colors.text
              }}
            >
              {group.speakerName}
            </div>
            <div>
              {group.text.map((text, i) => (
                <p key={i} style={{ marginBottom: '4px', color: '#1f2937' }}>
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

export default StyledTranscript; 