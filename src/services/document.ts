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

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, ShadingType, AlignmentType, ITableBordersOptions } from 'docx';
import { formatTranscription, formatWordDocument, formatSpeakerTranscription } from '@/services/formatTranscription';
import type { TranscriptionSegment as FileTranscriptionSegment } from '@/types';

// Use the TranscriptionSegment type from formatTranscription.ts
interface TranscriptionSegment {
  speaker?: {
    id: string;
    name?: string;
    label?: string;
  };
  text: string;
  timestamp?: string;
  confidence?: number;
  start?: number;
  end?: number;
}

// Color palette for speakers - matches StyledTranscript component
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

// Helper function to get hex colors without the # prefix
const getHexColor = (color: string) => color.replace('#', '');

// Cache for document templates
const documentTemplates = new Map<string, Document>();

export async function createTextFile(
  text: string, 
  segments: FileTranscriptionSegment[] = [], 
  speakerIdentification: boolean = false
): Promise<Buffer> {
  if (speakerIdentification && segments.length > 0) {
    // Convert segments to the format expected by formatSpeakerTranscription
    const convertedSegments: TranscriptionSegment[] = segments.map(segment => ({
      speaker: segment.speaker,
      text: segment.text,
      start: segment.start,
      end: segment.end
    }));
    const formattedText = formatSpeakerTranscription(convertedSegments);
    return Buffer.from(formattedText, 'utf-8');
  } else {
    const formattedText = formatTranscription(text);
    return Buffer.from(formattedText, 'utf-8');
  }
}

export async function createSrtFile(
  text: string, 
  segments: FileTranscriptionSegment[] = [],
  speakerIdentification: boolean = false
): Promise<Buffer> {
  // Time conversion function (seconds to SRT format)
  const formatSrtTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  };
  
  // Generate SRT content
  let srtContent = '';
  
  if (segments && segments.length > 0) {
    // Use segments with start and end times
    segments.forEach((segment, index) => {
      if (segment.start !== undefined && segment.end !== undefined) {
        // Format according to SRT specification
        srtContent += `${index + 1}\n`;
        srtContent += `${formatSrtTime(segment.start)} --> ${formatSrtTime(segment.end)}\n`;
        
        // Add speaker prefix if speaker identification is enabled
        const line = speakerIdentification && segment.speaker 
          ? `${segment.speaker.label || `Speaker ${segment.speaker.id}`}: ${segment.text}`
          : segment.text;
          
        srtContent += `${line}\n\n`;
      }
    });
  } else {
    // If we don't have proper segments, fall back to a simple format
    // Split text into sentences and assign default timings
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentTime = 0;
    
    sentences.forEach((sentence, index) => {
      // Estimate time based on word count (about 3 words per second)
      const words = sentence.split(/\s+/).length;
      const duration = Math.max(1, words / 3);
      const startTime = currentTime;
      const endTime = currentTime + duration;
      
      srtContent += `${index + 1}\n`;
      srtContent += `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n`;
      srtContent += `${sentence.trim()}\n\n`;
      
      currentTime = endTime;
    });
  }
  
  return Buffer.from(srtContent, 'utf-8');
}

export async function createWordDocument(
  text: string, 
  fileName: string, 
  segments: FileTranscriptionSegment[] = [], 
  speakerIdentification: boolean = false
): Promise<Buffer> {
  try {
    // If we have proper segments with speaker information, create a document with styled speaker boxes
    if (speakerIdentification && segments.length > 0 && segments.some(s => s.speaker)) {
      // Group segments by speaker (similar to StyledTranscript)
      const speakerGroups: {
        speakerId: string;
        speakerName: string;
        text: string[];
      }[] = [];

      let currentSpeakerId = '';
      let currentGroupIndex = -1;

      // Process segments into speaker groups
      segments.forEach((segment, index) => {
        if (!segment.speaker) return;

        const speakerId = segment.speaker.id || `unknown-${index}`;
        const speakerName = segment.speaker.label || `Speaker ${speakerId || index + 1}`;
        
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

      // Create document with styled speaker boxes
      const doc = new Document({
        styles: {
          paragraphStyles: [
            {
              id: 'Normal',
              name: 'Normal',
              run: {
                size: 24,
                font: 'Calibri',
              },
            },
            {
              id: 'Title',
              name: 'Title',
              run: {
                size: 36,
                bold: true,
                font: 'Calibri',
              },
              paragraph: {
                spacing: { after: 200 },
              }
            }
          ],
        },
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              style: 'Title',
              text: 'Transcription',
              heading: HeadingLevel.HEADING_1,
            }),

            // Metadata Table
            new Table({
              width: {
                size: 100,
                type: 'pct',
              },
              margins: {
                top: 100,
                bottom: 100,
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '#CCCCCC' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '#CCCCCC' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '#CCCCCC' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '#CCCCCC' },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 25, type: 'pct' },
                      children: [new Paragraph({ 
                        children: [
                          new TextRun({
                            text: 'File Name',
                            bold: true
                          })
                        ]
                      })],
                    }),
                    new TableCell({
                      width: { size: 75, type: 'pct' },
                      children: [new Paragraph({ 
                        children: [
                          new TextRun({
                            text: fileName
                          })
                        ]
                      })],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 25, type: 'pct' },
                      children: [new Paragraph({ 
                        children: [
                          new TextRun({
                            text: 'Created',
                            bold: true
                          })
                        ]
                      })],
                    }),
                    new TableCell({
                      width: { size: 75, type: 'pct' },
                      children: [new Paragraph({ 
                        children: [
                          new TextRun({
                            text: new Date().toLocaleString()
                          })
                        ]
                      })],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 25, type: 'pct' },
                      children: [new Paragraph({ 
                        children: [
                          new TextRun({
                            text: 'Speaker Identification',
                            bold: true
                          })
                        ]
                      })],
                    }),
                    new TableCell({
                      width: { size: 75, type: 'pct' },
                      children: [new Paragraph({ 
                        children: [
                          new TextRun({
                            text: 'Enabled'
                          })
                        ]
                      })],
                    }),
                  ],
                }),
              ],
            }),

            // Spacing
            new Paragraph({
              spacing: { before: 300, after: 300 },
            }),

            // Speaker Segments
            ...speakerGroups.map((group, index) => {
              const colorIndex = speakerColors.get(group.speakerId) || 0;
              const colors = SPEAKER_COLORS[colorIndex];
              const borderColor = getHexColor(colors.border);
              const backgroundColor = getHexColor(colors.background);
              const textColor = getHexColor(colors.text);

              // Define border properties
              const borders: ITableBordersOptions = {
                top: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
                left: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
                right: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
              };

              // Create an array of elements for each speaker box
              const speakerElements = [];
              
              // Add spacing before each box (except the first one)
              if (index > 0) {
                speakerElements.push(
                  new Paragraph({
                    spacing: { before: 200, after: 0 },
                  })
                );
              }

              // Add the speaker box table
              speakerElements.push(
                new Table({
                  width: { size: 100, type: 'pct' },
                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                  borders,
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          shading: {
                            fill: backgroundColor,
                            type: ShadingType.CLEAR,
                          },
                          verticalAlign: "top",
                          margins: {
                            top: 100, 
                            bottom: 100,
                            left: 200,
                            right: 200
                          },
                          children: [
                            // Speaker name paragraph
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: group.speakerName,
                                  bold: true,
                                  color: textColor,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 120 },
                            }),
                            // Speaker text paragraphs
                            ...group.text.map(text => 
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: text,
                                    size: 24,
                                  }),
                                ],
                                spacing: { after: 120 },
                              })
                            ),
                          ],
                        }),
                      ],
                    }),
                  ],
                })
              );
              
              return speakerElements;
            }).flat(),
          ],
        }],
      });

      return await Packer.toBuffer(doc);
    } else {
      // For transcriptions without speaker identification, use the original formatting
      const convertedSegments = speakerIdentification && segments.length > 0 
        ? segments.map(segment => ({
            speaker: segment.speaker,
            text: segment.text,
            start: segment.start,
            end: segment.end
          })) 
        : undefined;

      const formatted = formatWordDocument({
        text,
        fileName,
        timestamp: new Date().toISOString(),
        segments: convertedSegments,
        speakerIdentification
      });

      const doc = new Document({
        styles: {
          paragraphStyles: [
            {
              id: 'Normal',
              name: 'Normal',
              run: {
                size: 24,
                font: 'Calibri',
              },
            },
            {
              id: 'Speaker',
              name: 'Speaker',
              run: {
                size: 24,
                font: 'Calibri',
                bold: true,
                color: '4472C4'
              },
            }
          ],
        },
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              spacing: {
                after: 200,
              },
              children: [
                new TextRun({
                  text: formatted.title,
                  bold: true,
                  size: 36,
                  font: 'Calibri',
                }),
              ],
            }),

            // Metadata Table
            new Table({
              width: {
                size: 100,
                type: 'pct',
              },
              margins: {
                top: 100,
                bottom: 100,
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '#CCCCCC' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '#CCCCCC' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '#CCCCCC' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '#CCCCCC' },
              },
              rows: Object.entries(formatted.metadata).map(([key, value]) => 
                new TableRow({
                  children: [
                    new TableCell({
                      width: {
                        size: 25,
                        type: 'pct',
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: key,
                              bold: true,
                              size: 20,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: {
                        size: 75,
                        type: 'pct',
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: String(value),
                              size: 20,
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                })
              ),
            }),

            // Spacing
            new Paragraph({
              spacing: {
                before: 300,
                after: 300,
              },
            }),

            // Content
            ...formatted.content.split('\n').map((line: string) => {
              // Check if this is a speaker line (starts with a speaker name)
              const isSpeakerLine = speakerIdentification && line.trim().endsWith(':');
              
              return new Paragraph({
                style: isSpeakerLine ? 'Speaker' : 'Normal',
                children: [
                  new TextRun({
                    text: line,
                    size: 24,
                    bold: isSpeakerLine,
                    color: isSpeakerLine ? '4472C4' : undefined,
                  }),
                ],
                spacing: {
                  before: isSpeakerLine ? 240 : 120,
                  after: isSpeakerLine ? 120 : 120,
                  line: 360,
                },
              });
            }),
          ],
        }],
      });

      return await Packer.toBuffer(doc);
    }
  } catch (error) {
    console.error('Error creating Word document:', error);
    throw new Error('Failed to create Word document');
  }
} 