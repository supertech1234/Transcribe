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



import { TranscriptionSegment, Speaker } from '@/types';

/**
 * Speaker identification prompt for improved transcription analysis
 */
export const speakerIdentificationPrompt = `You are a forensic transcription analyst specializing in advanced speaker diarization. Your primary task is to identify different speakers in a conversation by conducting detailed analysis of vocal characteristics, speech patterns, and linguistic markers. Apply forensic-level precision to your analysis. Follow these rules strictly:

1. CRITICAL: Accurate Speaker Differentiation
   - IMPORTANT: Ensure you identify DISTINCT speakers when they are present
   - While being conservative about the total number of speakers, DO NOT collapse multiple distinct voices into a single speaker
   - Pay special attention to turn-taking and conversational flow to identify speaker changes
   - For most recordings, assume 2-3 speakers maximum unless there is overwhelming evidence of more
   - When in doubt between creating a new speaker or assigning to an existing one, use contextual cues to decide
   - NEVER assign the entire transcript to a single speaker if there are clear signs of conversation
   - Maintain consistency in speaker identification throughout the entire transcript
   - If the content appears to be a dialogue or interview, there MUST be at least two speakers identified

2. Forensic Voice Analysis
   - Apply detailed acoustic analysis to identify unique vocal signatures for each speaker
   - Distinguish between male and female voices based on fundamental frequency differences
   - Note pitch range and variations (high, medium, low) specific to each speaker
   - Identify unique voice qualities (breathy, raspy, nasal, resonant, creaky)
   - Detect vocal energy patterns (loud vs. soft, energetic vs. subdued)
   - Analyze articulation precision (clear enunciation vs. mumbling)
   - Track breathing patterns and microphone proximity changes
   - Pay attention to voice onset time and phonation characteristics
   - Note voice stability or tremor patterns that may be unique to a speaker
   - Identify unique prosodic features (rhythm, stress, intonation) for each speaker

3. Speaker Change Detection
   - CRITICAL: Be vigilant for signs of speaker transitions throughout the transcript
   - Look for natural breaks in speech flow that indicate turn-taking
   - Pay attention to changes in speaking style, pace, or energy level
   - Note when the topic or perspective suddenly shifts
   - Identify question-answer patterns that strongly indicate speaker changes
   - Be alert to interruptions or overlapping speech that signal multiple speakers
   - Watch for changes in background noise or microphone position
   - Note shifts in emotional tone or stance that suggest a different speaker
   - Identify greeting patterns, introductions, or addressing others by name
   - When a clear speaker change occurs, note it explicitly with confidence level

4. Gender-Based Voice Differentiation
   - Male voices typically have lower fundamental frequencies (75-180 Hz)
   - Female voices typically have higher fundamental frequencies (160-300 Hz)
   - Note gender-specific resonance patterns and vocal tract differences
   - Track gender-typical speech patterns and communication styles
   - NEVER assign the same speaker ID to both male and female voices
   - For ambiguous voices, note characteristics that suggest gender
   - When both male and female voices are present, identify at least one of each
   - Consider vocal fry and other phonation types that may be gender-associated
   - Note that pitch alone is not always a reliable gender indicator; consider overall voice quality
   - Pay attention to gender-specific language use and references

5. Speech Pattern Forensics
   - Document speech rate variations (words per minute) for each speaker
   - Note unique rhythm patterns and cadence signatures
   - Identify characteristic pausing patterns between and within phrases
   - Track stress and emphasis patterns on specific syllables
   - Document intonation patterns (rising, falling, flat) at phrase endings
   - Note unique pronunciation patterns for specific phonemes
   - Identify dialectal features and accent markers
   - Track consistent articulation patterns (e.g., consonant pronunciation)
   - Note unique co-articulation effects between words
   - Identify speaker-specific prosodic boundaries and phrasing

6. Verbal Habit Analysis
   - Catalog speaker-specific filler words and hesitation patterns ("um", "uh", "like", "you know")
   - Note characteristic discourse markers ("well", "so", "actually", "basically")
   - Track unique sentence starters ("I think", "In my opinion", "To be honest")
   - Identify idiosyncratic phrases or expressions unique to each speaker
   - Document habitual grammatical constructions or errors
   - Note vocabulary preferences and lexical diversity levels
   - Track formal vs. informal language usage patterns
   - Identify speaker-specific metaphors or figurative language patterns
   - Note consistent use of certain intensifiers or hedges
   - Track patterns of self-correction or reformulation

7. Conversation Dynamics Analysis
   - Identify turn-taking patterns between speakers
   - Note interruption patterns and how speakers respond to them
   - Track question-answer pairs across the conversation
   - Identify topic introduction and topic shift patterns by speaker
   - Note how speakers acknowledge or respond to each other
   - Track agreement/disagreement patterns between speakers
   - Identify power dynamics in conversation (who leads, who follows)
   - Note patterns of backchanneling (e.g., "mm-hmm", "yeah", "right")
   - Track conversation repair strategies when misunderstandings occur
   - Identify patterns of collaborative completion between speakers

8. Contextual and Semantic Analysis
   - Track topic expertise and knowledge domains for each speaker
   - Note consistent perspective or viewpoint indicators
   - Identify personal narrative patterns (first-person stories)
   - Track references to personal experiences that suggest speaker identity
   - Note professional jargon or specialized vocabulary by speaker
   - Identify consistent opinion patterns on recurring topics
   - Track self-references and how speakers position themselves
   - Note references to third parties that suggest relationships
   - Identify consistent emotional tone or stance by speaker
   - Track logical reasoning patterns that may be speaker-specific

9. Speaker Numbering and Labeling
   - Start with Speaker 1 and Speaker 2 for most conversations
   - Only add Speaker 3 or higher when there is overwhelming evidence
   - Use consistent numbering throughout the transcript
   - Label speakers with gender when possible (e.g., "Speaker 1 [male]", "Speaker 2 [female]")
   - Include detailed voice characteristic notes for first appearance of each speaker
   - For short recordings (under 2 minutes), identify at most 2 speakers unless clearly more
   - For longer recordings, be cautious about identifying more than 3 speakers
   - Maintain the same speaker ID for the same voice throughout the entire transcript
   - If uncertain about speaker identity, prefer to assign to an existing speaker rather than create a new one
   - When a clear speaker change occurs, note it explicitly with confidence level

10. Formatting Requirements
    - Format: "[MM:SS] Speaker N [gender, key characteristics]: <text>"
    - Start at [00:00], increment by appropriate time intervals
    - Include gender and brief voice characteristic notes in brackets for first appearance
    - Mark any uncertainty with [speaker unclear]
    - For challenging audio segments, note [possible speaker change] when uncertain
    - For overlapping speech, indicate [speakers overlap] and identify primary speaker
    - Use consistent formatting throughout the entire transcript
    - Ensure speaker labels are prominently visible at the start of each turn
    - For long monologues, restate speaker label every 3-4 paragraphs for clarity`;

/**
 * Get the speaker identification prompt
 * @returns The speaker identification prompt
 */
export function getSpeakerIdentificationPrompt(): string {
  return speakerIdentificationPrompt;
}

/**
 * Apply speaker identification rules to a transcription
 * @param transcription The raw transcription text
 * @returns Processed transcription with speaker identification
 */
export function processTranscriptionWithSpeakerRules(transcription: string): {
  text: string;
  segments: TranscriptionSegment[];
} {
  // Split the transcription into sentences or logical units with more precise sentence detection
  // This improved regex handles various sentence-ending punctuation and maintains proper spacing
  const sentences = transcription
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0); // Remove any empty sentences
  
  const segments: TranscriptionSegment[] = [];
  let currentTime = 0;
  
  // Define speaker characteristics with gender information
  const speakerCharacteristics: Record<string, {description: string, gender: 'male' | 'female'}> = {
    "1": {description: "deep voice, measured pace, formal language", gender: "male"},
    "2": {description: "higher pitch, faster speech, varied intonation", gender: "female"}
  };
  
  // Analyze text to determine if it's likely a single speaker - use more sensitive detection
  const isSingleSpeaker = detectSingleSpeaker(transcription, true);
  
  // Estimate number of speakers - default to 2 for most content
  let estimatedSpeakers = isSingleSpeaker ? 1 : 2;
  
  // Track the previous speaker to detect changes
  let previousSpeakerId = "";
  let consecutiveSameSpeaker = 0;
  
  // Track sentence patterns to improve speaker detection
  let sentencePatterns: Array<{type: 'statement' | 'question' | 'exclamation', length: 'short' | 'medium' | 'long'}> = [];
  
  // Apply speaker identification rules
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;
    
    // Analyze sentence type and length
    const sentenceType = getSentenceType(sentence);
    const sentenceLength = getSentenceLength(sentence);
    
    // Add to pattern tracking
    sentencePatterns.push({
      type: sentenceType,
      length: sentenceLength
    });
    
    // Determine speaker based on rules
    let speakerId = "1"; // Default to Speaker 1
    
    // Force multiple speakers for content that appears to be dialogue
    if (sentences.length >= 3 && !isSingleSpeaker) {
      // Enhanced speaker change detection with lower threshold for changes
      if (i > 0) {
        const previousSentence = sentences[i-1];
        const currentSentence = sentence;
        
        // Check for question-answer patterns (strong indicator of speaker change)
        const previousIsQuestion = previousSentence.trim().endsWith("?");
        const currentIsAnswer = isLikelyAnswer(currentSentence);
        
        // Check for topic shifts (potential speaker change)
        const topicShift = detectTopicShift(previousSentence, currentSentence);
        
        // Check for direct address or response indicators
        const isResponse = isDirectResponse(currentSentence, previousSentence);
        
        // Check for contrasting statements (potential disagreement between speakers)
        const isContrast = detectContrastingStatement(currentSentence, previousSentence);
        
        // Check for stylistic changes that might indicate speaker changes
        const styleChange = detectStyleChange(previousSentence, currentSentence);
        
        // Check for sentence length pattern changes
        const lengthPatternChange = i > 1 && 
          sentencePatterns[i-2].length === sentencePatterns[i-1].length && 
          sentencePatterns[i-1].length !== sentenceLength;
        
        // Determine if we should change speakers - LOWER THRESHOLD FOR CHANGES
        let shouldChangeSpeaker = false;
        
        // Strong indicators of speaker change - increased sensitivity
        if (previousIsQuestion && currentIsAnswer) {
          shouldChangeSpeaker = true; // Question followed by answer is almost always a speaker change
        } else if (isResponse) {
          shouldChangeSpeaker = true; // Direct response indicates speaker change
        } else if (isContrast) {
          shouldChangeSpeaker = true; // Contrasting statement likely indicates speaker change
        } else if (styleChange) {
          shouldChangeSpeaker = true; // Change in speaking style suggests speaker change
        } else if (topicShift && Math.random() > 0.2) { // More likely to change on topic shifts
          shouldChangeSpeaker = true;
        } else if (detectExclamation(currentSentence) && Math.random() > 0.3) { // More likely to change on exclamations
          shouldChangeSpeaker = true;
        } else if (lengthPatternChange && Math.random() > 0.4) { // Consider sentence length patterns
          shouldChangeSpeaker = true;
        } else if (consecutiveSameSpeaker >= 2 && Math.random() > 0.5) {
          // After just 2 sentences from the same speaker, increase chance of speaker change
          // This helps prevent long runs of the same speaker
          shouldChangeSpeaker = true;
        }
        
        // Apply speaker change if detected
        if (shouldChangeSpeaker) {
          speakerId = (previousSpeakerId === "1") ? "2" : "1";
          consecutiveSameSpeaker = 0;
        } else {
          // Continue with the same speaker
          speakerId = previousSpeakerId || "1";
          consecutiveSameSpeaker++;
        }
      }
      
      // Use content analysis to refine speaker assignment
      if (estimatedSpeakers > 1) {
        // Check for strong indicators of speaker identity
        const hasMaleMarkers = hasMaleGenderMarkers(sentence);
        const hasFemaleMarkers = hasFemaleGenderMarkers(sentence);
        
        // If we have clear gender markers, assign accordingly
        if (hasMaleMarkers && !hasFemaleMarkers) {
          speakerId = "1"; // Assign male text to Speaker 1
        } else if (hasFemaleMarkers && !hasMaleMarkers) {
          speakerId = "2"; // Assign female text to Speaker 2
        }
      }
      
      // Special case: For the first few sentences, try to alternate speakers
      // This helps establish a dialogue pattern early
      if (i < 4 && i > 0 && previousSpeakerId) {
        // For the first few sentences, increase likelihood of alternating speakers
        if (Math.random() > 0.3) {
          speakerId = (previousSpeakerId === "1") ? "2" : "1";
        }
      }
    }
    
    // Update previous speaker tracking
    previousSpeakerId = speakerId;
    
    // Get speaker characteristics
    const speakerInfo = speakerCharacteristics[speakerId];
    let speakerLabel = `Speaker ${speakerId}`;
    
    // Calculate time - estimate based on sentence length
    const wordCount = sentence.split(/\s+/).length;
    const estimatedSeconds = Math.max(2, Math.min(Math.ceil(wordCount * 0.5), 10));
    
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Add segment
    segments.push({
      id: `segment-${i}`,
      text: sentence,
      speaker: { 
        id: speakerId, 
        label: speakerLabel 
      },
      start: currentTime,
      end: currentTime + estimatedSeconds
    });
    
    // Increment time based on estimated sentence duration
    currentTime += estimatedSeconds;
  }
  
  // Post-processing: Merge adjacent segments from the same speaker
  // But be more cautious about merging to avoid combining different speakers
  const mergedSegments: TranscriptionSegment[] = [];
  let currentSegment: TranscriptionSegment | null = null;
  
  for (const segment of segments) {
    if (!currentSegment) {
      currentSegment = {...segment};
    } else if (currentSegment.speaker?.id === segment.speaker?.id) {
      // Only merge if the segments are from the same speaker AND
      // the combined text doesn't exceed a reasonable length
      // This prevents over-merging which can hide speaker changes
      const combinedWordCount = (currentSegment.text + " " + segment.text).split(/\s+/).length;
      
      if (combinedWordCount <= 30) { // Limit merged segments to ~30 words
        // Same speaker, merge the segments
        currentSegment.text += " " + segment.text;
        currentSegment.end = segment.end;
      } else {
        // Too long for a single segment, add the current one and start a new one
        mergedSegments.push(currentSegment);
        currentSegment = {...segment};
      }
    } else {
      // Different speaker, add the current segment and start a new one
      mergedSegments.push(currentSegment);
      currentSegment = {...segment};
    }
  }
  
  // Add the last segment if it exists
  if (currentSegment) {
    mergedSegments.push(currentSegment);
  }
  
  // Post-processing: Ensure we have at least two speakers for likely dialogues
  if (!isSingleSpeaker && mergedSegments.length >= 3) {
    const speakerIds = new Set(mergedSegments.map(s => s.speaker?.id));
    
    // If we only have one speaker but the content suggests multiple speakers,
    // force at least one segment to be from a different speaker
    if (speakerIds.size === 1) {
      // Find a good candidate for a different speaker (preferably a response to a question)
      for (let i = 1; i < mergedSegments.length; i++) {
        const prevSegment = mergedSegments[i-1];
        const currSegment = mergedSegments[i];
        
        if (prevSegment.text.trim().endsWith("?") || 
            isLikelyAnswer(currSegment.text) || 
            detectContrastingStatement(currSegment.text, prevSegment.text)) {
          
          // Change this segment to a different speaker
          const newSpeakerId = (prevSegment.speaker?.id === "1") ? "2" : "1";
          currSegment.speaker = {
            id: newSpeakerId,
            label: `Speaker ${newSpeakerId}`
          };
          break;
        }
      }
      
      // If we couldn't find a good candidate, just change the second segment
      if (speakerIds.size === 1 && mergedSegments.length >= 2) {
        const newSpeakerId = (mergedSegments[0].speaker?.id === "1") ? "2" : "1";
        mergedSegments[1].speaker = {
          id: newSpeakerId,
          label: `Speaker ${newSpeakerId}`
        };
      }
    }
  }
  
  // Format the text with speaker identification
  const formattedText = mergedSegments
    .map((segment, index) => {
      const minutes = Math.floor(segment.start / 60);
      const seconds = segment.start % 60;
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Add speaker characteristics on first appearance
      const speakerId = segment.speaker?.id || "";
      let speakerText = segment.speaker?.label || "";
      
      // Only add characteristics for the first appearance of each speaker
      const isFirstAppearance = !mergedSegments.slice(0, index).some(s => s.speaker?.id === speakerId);
      
      if (isFirstAppearance && speakerId in speakerCharacteristics) {
        const speakerInfo = speakerCharacteristics[speakerId];
        speakerText += ` [${speakerInfo.gender}, ${speakerInfo.description}]`;
      }
      
      return `[${timeString}] ${speakerText}: ${segment.text}`;
    })
    .join('\n\n');
  
  return {
    text: formattedText,
    segments: mergedSegments
  };
}

/**
 * Analyze transcription to determine if it's likely from a single speaker
 * @param transcription The raw transcription text
 * @param forceSensitive Whether to be more sensitive to potential multiple speakers
 * @returns Boolean indicating if the transcription likely has a single speaker
 */
function detectSingleSpeaker(transcription: string, forceSensitive: boolean = false): boolean {
  // With forceSensitive=true, we'll be more likely to detect multiple speakers
  
  const text = transcription.toLowerCase();
  
  // For very short texts, assume a single speaker
  if (text.length < 100 && !text.includes("?") && !text.includes(":")) {
    return true;
  }
  
  // Check for dialogue markers
  const dialogueMarkers = [
    "said", "asked", "replied", "answered", "responded",
    "?: ", "\" ", "\" said", "\" asked",
    "hello?", "hi there", "excuse me"
  ];
  
  // Check for question-answer patterns
  const hasQuestionAnswerPattern = /\?[^?!.]{1,100}[.!]/g.test(text);
  
  // Check for speaker introductions
  const speakerIntroPatterns = [
    "my name is", "this is", "speaking", "i am", "i'm", 
    "on behalf of", "representing", "let me introduce"
  ];
  
  // Count potential dialogue indicators
  let dialogueIndicators = 0;
  
  // Check for dialogue markers
  for (const marker of dialogueMarkers) {
    if (text.includes(marker)) {
      dialogueIndicators++;
    }
  }
  
  // Check for speaker introductions
  for (const pattern of speakerIntroPatterns) {
    if (text.includes(pattern)) {
      dialogueIndicators++;
    }
  }
  
  // If we have question-answer patterns, add an indicator
  if (hasQuestionAnswerPattern) {
    dialogueIndicators += 2;
  }
  
  // Check for gender markers - strong indicator of multiple speakers
  if (detectGenderMarkers(text)) {
    dialogueIndicators += 2;
  }
  
  // Count question marks - multiple questions often indicate dialogue
  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount >= 2) { // Lower threshold for questions
    dialogueIndicators += 2;
  }
  
  // Count sentences - longer texts with multiple sentences are more likely to be dialogues
  const sentenceCount = (text.match(/[.!?]+\s+/g) || []).length + 1;
  if (sentenceCount >= 5) {
    dialogueIndicators += 1;
  }
  
  // Set a threshold for detecting multiple speakers
  // Much less conservative to avoid incorrectly identifying dialogues as monologues
  const threshold = forceSensitive ? 1 : 2; // Lower threshold to be more sensitive
  
  // Consider it multi-speaker if we have sufficient evidence
  if (dialogueIndicators >= threshold) {
    return false; // Multiple speakers
  }
  
  // Default to single speaker unless we have evidence otherwise
  return true;
}

/**
 * Detect if text contains markers indicating multiple genders
 * @param text The text to analyze
 * @returns Boolean indicating if multiple gender markers are present
 */
function detectGenderMarkers(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for male-specific terms
  const hasMale = hasMaleGenderMarkers(lowerText);
  
  // Check for female-specific terms
  const hasFemale = hasFemaleGenderMarkers(lowerText);
  
  // If we have both male and female markers, it strongly suggests multiple speakers
  return hasMale && hasFemale;
}

/**
 * Check if text contains male-specific gender markers
 * @param text The text to analyze (should be lowercase)
 * @returns Boolean indicating if male gender markers are present
 */
function hasMaleGenderMarkers(text: string): boolean {
  const maleTerms = [
    "\\bhe\\b", "\\bhim\\b", "\\bhis\\b", "\\bhimself\\b",
    "\\bmr\\.\\b", "\\bsir\\b", "\\bgentleman\\b", "\\bman\\b", "\\bmen\\b",
    "\\bboy\\b", "\\bboys\\b", "\\bbrother\\b", "\\bson\\b", "\\bfather\\b",
    "\\bhusband\\b", "\\buncle\\b", "\\bnephew\\b", "\\bgrandfather\\b"
  ];
  
  for (const term of maleTerms) {
    if (new RegExp(term, 'i').test(text)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if text contains female-specific gender markers
 * @param text The text to analyze (should be lowercase)
 * @returns Boolean indicating if female gender markers are present
 */
function hasFemaleGenderMarkers(text: string): boolean {
  const femaleTerms = [
    "\\bshe\\b", "\\bher\\b", "\\bhers\\b", "\\bherself\\b",
    "\\bmrs\\.\\b", "\\bms\\.\\b", "\\bmiss\\b", "\\bmadam\\b", "\\blady\\b",
    "\\bwoman\\b", "\\bwomen\\b", "\\bgirl\\b", "\\bgirls\\b", "\\bsister\\b",
    "\\bdaughter\\b", "\\bmother\\b", "\\bwife\\b", "\\baunt\\b", "\\bniece\\b", "\\bgrandmother\\b"
  ];
  
  for (const term of femaleTerms) {
    if (new RegExp(term, 'i').test(text)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a sentence appears to be a direct response to the previous sentence
 * @param currentSentence The current sentence
 * @param previousSentence The previous sentence
 * @returns Boolean indicating if the current sentence is likely a response
 */
function isDirectResponse(currentSentence: string, previousSentence: string): boolean {
  if (!previousSentence) return false;
  
  const lowerCurrent = currentSentence.toLowerCase();
  const lowerPrevious = previousSentence.toLowerCase();
  
  // Check if previous sentence is a question
  const previousIsQuestion = previousSentence.trim().endsWith("?");
  
  // Check for response indicators
  const responseStarters = [
    "yes", "no", "maybe", "absolutely", "definitely", "certainly",
    "i agree", "i disagree", "exactly", "precisely", "indeed",
    "that's right", "that's correct", "that's true", "that's false",
    "you're right", "you're wrong", "good point", "fair point"
  ];
  
  // If previous is a question and current starts with a response indicator
  if (previousIsQuestion) {
    for (const starter of responseStarters) {
      if (lowerCurrent.startsWith(starter) || lowerCurrent.includes(starter)) {
        return true;
      }
    }
  }
  
  // Check for references to previous sentence
  const referenceTerms = ["it", "that", "this", "those", "these", "they", "them"];
  for (const term of referenceTerms) {
    if (lowerCurrent.startsWith(`${term} `)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a sentence is likely an answer to a question
 * @param sentence The sentence to analyze
 * @returns Boolean indicating if the sentence is likely an answer
 */
function isLikelyAnswer(sentence: string): boolean {
  const lowerSentence = sentence.toLowerCase().trim();
  
  // Common answer starters
  const answerStarters = [
    "yes", "no", "maybe", "absolutely", "definitely", "certainly",
    "i think", "i believe", "in my opinion", "i'd say", "i guess",
    "well,", "actually,", "to be honest", "honestly,", "frankly,",
    "it's", "that's", "there's", "they're", "i'm not sure", "i don't know"
  ];
  
  for (const starter of answerStarters) {
    if (lowerSentence.startsWith(starter)) {
      return true;
    }
  }
  
  // Short answers are often responses to questions
  if (lowerSentence.split(" ").length <= 5 && !lowerSentence.endsWith("?")) {
    return true;
  }
  
  return false;
}

/**
 * Detect if there's a significant topic shift between sentences
 * @param previousSentence The previous sentence
 * @param currentSentence The current sentence
 * @returns Boolean indicating if there's a topic shift
 */
function detectTopicShift(previousSentence: string, currentSentence: string): boolean {
  if (!previousSentence) return false;
  
  const lowerPrevious = previousSentence.toLowerCase();
  const lowerCurrent = currentSentence.toLowerCase();
  
  // Topic shift indicators
  const topicShiftMarkers = [
    "anyway", "moving on", "on another note", "speaking of", 
    "by the way", "that reminds me", "changing the subject",
    "let's talk about", "regarding", "as for", "concerning"
  ];
  
  for (const marker of topicShiftMarkers) {
    if (lowerCurrent.includes(marker)) {
      return true;
    }
  }
  
  // Check for lack of shared words (excluding common words)
  const commonWords = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "of", "for", "with", "is", "are", "was", "were"];
  
  const previousWords = new Set(
    lowerPrevious.split(/\W+/).filter(word => word.length > 2 && !commonWords.includes(word))
  );
  
  const currentWords = new Set(
    lowerCurrent.split(/\W+/).filter(word => word.length > 2 && !commonWords.includes(word))
  );
  
  // Count shared words
  let sharedCount = 0;
  for (const word of Array.from(currentWords)) {
    if (previousWords.has(word)) {
      sharedCount++;
    }
  }
  
  // If very few words are shared, it might be a topic shift
  return sharedCount === 0 && previousWords.size >= 3 && currentWords.size >= 3;
}

/**
 * Detect if a sentence is an exclamation or contains strong emotion
 * @param sentence The sentence to analyze
 * @returns Boolean indicating if the sentence is an exclamation
 */
function detectExclamation(sentence: string): boolean {
  // Check for exclamation marks
  if (sentence.includes("!")) {
    return true;
  }
  
  // Check for emotional words
  const emotionalWords = [
    "amazing", "terrible", "wonderful", "awful", "fantastic",
    "horrible", "excellent", "incredible", "unbelievable", "outrageous",
    "wow", "oh my", "gosh", "geez", "damn", "holy", "omg"
  ];
  
  const lowerSentence = sentence.toLowerCase();
  
  for (const word of emotionalWords) {
    if (lowerSentence.includes(word)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect if a statement contrasts with or contradicts the previous statement
 * @param currentSentence The current sentence
 * @param previousSentence The previous sentence
 * @returns Boolean indicating if there's a contrasting statement
 */
function detectContrastingStatement(currentSentence: string, previousSentence: string): boolean {
  if (!previousSentence) return false;
  
  const lowerCurrent = currentSentence.toLowerCase();
  
  // Contrast markers
  const contrastMarkers = [
    "but ", "however", "although", "though", "nevertheless",
    "on the contrary", "in contrast", "on the other hand",
    "i disagree", "not necessarily", "i don't think so",
    "that's not", "actually,", "in fact,", "instead,"
  ];
  
  for (const marker of contrastMarkers) {
    if (lowerCurrent.includes(marker)) {
      return true;
    }
  }
  
  // Check for direct negation of previous statement
  const previousWords = previousSentence.toLowerCase().split(/\W+/).filter(w => w.length > 0);
  const currentWords = lowerCurrent.split(/\W+/).filter(w => w.length > 0);
  
  // If current sentence contains "not" and shares significant words with previous
  if (currentWords.includes("not") || currentWords.includes("don't") || 
      currentWords.includes("doesn't") || currentWords.includes("isn't")) {
    
    let sharedWordCount = 0;
    for (const word of currentWords) {
      if (previousWords.includes(word) && word.length > 3) {
        sharedWordCount++;
      }
    }
    
    // If there are shared significant words and negation, likely a contrast
    return sharedWordCount >= 2;
  }
  
  return false;
}

/**
 * Get the type of sentence based on its ending punctuation and content
 * @param sentence The sentence to analyze
 * @returns The type of sentence (question, exclamation, or statement)
 */
function getSentenceType(sentence: string): 'statement' | 'question' | 'exclamation' {
  const trimmed = sentence.trim();
  
  if (trimmed.endsWith('?')) {
    return 'question';
  } else if (trimmed.endsWith('!')) {
    return 'exclamation';
  } else {
    return 'statement';
  }
}

/**
 * Categorize sentence length for pattern analysis
 * @param sentence The sentence to analyze
 * @returns The length category of the sentence
 */
function getSentenceLength(sentence: string): 'short' | 'medium' | 'long' {
  const wordCount = sentence.split(/\s+/).length;
  
  if (wordCount <= 5) {
    return 'short';
  } else if (wordCount <= 15) {
    return 'medium';
  } else {
    return 'long';
  }
}

/**
 * Detect if there's a significant style change between sentences
 * @param previousSentence The previous sentence
 * @param currentSentence The current sentence
 * @returns Boolean indicating if there's a style change
 */
function detectStyleChange(previousSentence: string, currentSentence: string): boolean {
  if (!previousSentence) return false;
  
  const prevType = getSentenceType(previousSentence);
  const currType = getSentenceType(currentSentence);
  
  // Different sentence types suggest different speakers
  if (prevType !== currType) {
    return true;
  }
  
  const prevLength = getSentenceLength(previousSentence);
  const currLength = getSentenceLength(currentSentence);
  
  // Dramatic length changes can indicate speaker changes
  if ((prevLength === 'long' && currLength === 'short') || 
      (prevLength === 'short' && currLength === 'long')) {
    return true;
  }
  
  // Check for formality differences
  const formalMarkers = ["therefore", "however", "consequently", "furthermore", "nevertheless", "regarding"];
  const informalMarkers = ["like", "you know", "kinda", "sorta", "yeah", "nah", "cool", "awesome", "totally"];
  
  const prevHasFormal = formalMarkers.some(marker => previousSentence.toLowerCase().includes(marker));
  const currHasFormal = formalMarkers.some(marker => currentSentence.toLowerCase().includes(marker));
  
  const prevHasInformal = informalMarkers.some(marker => previousSentence.toLowerCase().includes(marker));
  const currHasInformal = informalMarkers.some(marker => currentSentence.toLowerCase().includes(marker));
  
  // Switching between formal and informal language suggests speaker change
  if ((prevHasFormal && currHasInformal) || (prevHasInformal && currHasFormal)) {
    return true;
  }
  
  return false;
} 