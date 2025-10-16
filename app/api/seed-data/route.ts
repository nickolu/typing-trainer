import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase-config';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { TestResult, KeystrokeEvent } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Sample words pool for generating test content
const WORD_POOL = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so',
  'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people',
  'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
  'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
  'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'program',
  'quick', 'brown', 'fox', 'jumps', 'lazy', 'dog', 'typing', 'speed', 'practice', 'keyboard'
];

// Common character substitutions for realistic mistakes
const COMMON_MISTAKES: Record<string, string[]> = {
  'a': ['s', 'q', 'z'],
  's': ['a', 'd', 'w'],
  'd': ['s', 'f', 'e'],
  'f': ['d', 'g', 'r'],
  'g': ['f', 'h', 't'],
  'h': ['g', 'j', 'y'],
  'j': ['h', 'k', 'u'],
  'k': ['j', 'l', 'i'],
  'l': ['k', 'o', 'p'],
  'e': ['w', 'r', 'd'],
  'r': ['e', 't', 'f'],
  't': ['r', 'y', 'g'],
  'y': ['t', 'u', 'h'],
  'u': ['y', 'i', 'j'],
  'i': ['u', 'o', 'k'],
  'o': ['i', 'p', 'l'],
  'p': ['o', 'l'],
};

function generateWords(count: number): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)]);
  }
  return words;
}

function randomDateInLastNDays(days: number): Date {
  const now = new Date();
  const randomMs = Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - randomMs);
}

function generateKeystrokeEvents(
  targetWords: string[],
  typedWords: string[],
  baseWPM: number,
  errorRate: number
): KeystrokeEvent[] {
  const events: KeystrokeEvent[] = [];
  let timestamp = 0;
  
  const avgTimePerChar = (60000 / baseWPM) / 5;
  
  // Generate minimal keystroke data - only first 5 words to keep document size very small
  // This is sufficient for aggregate analytics while avoiding buffer overflow
  const maxWords = Math.min(5, targetWords.length);
  
  for (let wordIndex = 0; wordIndex < maxWords; wordIndex++) {
    const targetWord = targetWords[wordIndex];
    const typedWord = typedWords[wordIndex] || '';
    
    for (let charIndex = 0; charIndex < typedWord.length; charIndex++) {
      const typedChar = typedWord[charIndex];
      const expectedChar = targetWord[charIndex];
      const wasCorrect = typedChar === expectedChar;
      
      const variance = 0.3;
      const timeForThisChar = avgTimePerChar * (1 + (Math.random() - 0.5) * variance);
      timestamp += timeForThisChar;
      
      events.push({
        timestamp,
        key: typedChar,
        wordIndex,
        charIndex,
        expectedChar,
        wasCorrect,
        isBackspace: false,
      });
    }
    
    // Add space after word
    if (wordIndex < maxWords - 1) {
      timestamp += avgTimePerChar;
      events.push({
        timestamp,
        key: ' ',
        wordIndex,
        charIndex: typedWord.length,
        expectedChar: ' ',
        wasCorrect: true,
        isBackspace: false,
      });
    }
  }
  
  return events;
}

function generateTypedWords(targetWords: string[], accuracy: number): string[] {
  return targetWords.map(word => {
    let typedWord = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (Math.random() * 100 < accuracy) {
        typedWord += char;
      } else {
        const mistakes = COMMON_MISTAKES[char] || ['a', 'e', 'i', 'o', 'u'];
        typedWord += mistakes[Math.floor(Math.random() * mistakes.length)];
      }
    }
    return typedWord;
  });
}

function calculateCharacterSubstitutions(events: KeystrokeEvent[]): Record<string, string[]> {
  const substitutions: Record<string, string[]> = {};
  
  events.forEach(event => {
    if (!event.wasCorrect && !event.isBackspace && event.expectedChar) {
      if (!substitutions[event.expectedChar]) {
        substitutions[event.expectedChar] = [];
      }
      substitutions[event.expectedChar].push(event.key);
    }
  });
  
  return substitutions;
}

function generateFakeTestResult(userId: string, createdAt: Date): TestResult {
  const baseWPM = 40 + Math.random() * 60;
  const accuracy = 85 + Math.random() * 14;
  const duration = 30;
  
  // Generate fewer words to keep document size manageable (20-40 words instead of full test)
  const wordsPerTest = 20 + Math.floor(Math.random() * 20);
  const targetWords = generateWords(wordsPerTest);
  const typedWords = generateTypedWords(targetWords, accuracy);
  
  const correctWordCount = targetWords.filter((word, i) => word === typedWords[i]).length;
  const incorrectWordCount = targetWords.length - correctWordCount;
  
  const errorRate = 1 - (accuracy / 100);
  const keystrokeTimings = generateKeystrokeEvents(targetWords, typedWords, baseWPM, errorRate);
  
  const mistakeEvents = keystrokeTimings.filter(e => !e.wasCorrect && !e.isBackspace);
  const correctionEvents = keystrokeTimings.filter(e => e.isBackspace);
  const characterSubstitutions = calculateCharacterSubstitutions(keystrokeTimings);
  
  const isPractice = Math.random() < 0.15;
  const practiceSequences = isPractice 
    ? [['th', 'he', 'er', 'an', 'in'][Math.floor(Math.random() * 5)]]
    : undefined;
  
  const testResult: TestResult = {
    id: uuidv4(),
    userId,
    createdAt,
    duration,
    status: 'COMPLETE',
    testContentId: `content-${Math.floor(Math.random() * 10)}`,
    targetWords,
    typedWords,
    wpm: Math.round(baseWPM),
    accuracy: Math.round(accuracy * 10) / 10,
    correctWordCount,
    incorrectWordCount,
    totalWords: targetWords.length,
    totalTypedWords: typedWords.length,
    keystrokeTimings,
    isPractice,
    practiceSequences,
    mistakeCount: mistakeEvents.length,
    correctionCount: correctionEvents.length,
    characterSubstitutions,
  };
  
  return testResult;
}

/**
 * Helper function to recursively remove undefined values from an object
 * Firestore doesn't accept undefined values
 */
function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }

  // Handle objects (including Date, Timestamp, etc.)
  if (typeof obj === 'object') {
    // Don't process Date or Timestamp objects
    if (obj instanceof Date || obj.constructor?.name === 'Timestamp') {
      return obj;
    }

    const cleaned: any = {};
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned;
  }

  // Return primitives as-is
  return obj;
}

async function saveTestResultDirect(result: TestResult): Promise<void> {
  const db = getFirebaseDb();
  const resultRef = doc(db, 'testResults', result.id);
  
  // Remove undefined fields as Firestore doesn't accept them
  const firestoreData = removeUndefinedFields({
    ...result,
    createdAt: Timestamp.fromDate(result.createdAt),
  });
  
  await setDoc(resultRef, firestoreData);
}

export async function POST(request: NextRequest) {
  try {
    // Get userId from request body
    const body = await request.json();
    const { userId, count = 200 } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required in request body' },
        { status: 400 }
      );
    }
    
    console.log(`Generating ${count} test results for user ${userId}...`);
    
    const daysToGenerate = 90;
    const results: TestResult[] = [];
    
    // Generate results
    for (let i = 0; i < count; i++) {
      const createdAt = randomDateInLastNDays(daysToGenerate);
      const result = generateFakeTestResult(userId, createdAt);
      results.push(result);
    }
    
    // Sort by date (oldest first)
    results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // Save to Firebase with batching and delays to prevent overwhelming the system
    let savedCount = 0;
    const batchSize = 10;
    
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(result => saveTestResultDirect(result))
      );
      
      savedCount += batch.length;
      console.log(`Saved ${savedCount}/${count} results...`);
      
      // Small delay between batches to avoid rate limits
      if (savedCount < results.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const summary = {
      totalTests: count,
      dateRange: {
        from: results[0].createdAt.toLocaleDateString(),
        to: results[results.length - 1].createdAt.toLocaleDateString(),
      },
      averageWPM: Math.round(results.reduce((sum, r) => sum + r.wpm, 0) / results.length),
      averageAccuracy: Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length),
    };
    
    console.log('Seeding complete!', summary);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully seeded fake data',
      summary,
    });
    
  } catch (error: any) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { error: 'Failed to seed data', details: error.message },
      { status: 500 }
    );
  }
}

