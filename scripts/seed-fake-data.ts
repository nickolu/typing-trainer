import { getFirebaseAuth, getFirebaseDb, initializeFirebase } from '../lib/firebase-config';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { TestResult, KeystrokeEvent } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase
initializeFirebase();

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

/**
 * Generate random words for a test
 */
function generateWords(count: number): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)]);
  }
  return words;
}

/**
 * Generate a random date within the last N days
 */
function randomDateInLastNDays(days: number): Date {
  const now = new Date();
  const randomMs = Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - randomMs);
}

/**
 * Simulate typing with realistic keystroke events
 */
function generateKeystrokeEvents(
  targetWords: string[],
  typedWords: string[],
  baseWPM: number,
  errorRate: number
): KeystrokeEvent[] {
  const events: KeystrokeEvent[] = [];
  let timestamp = 0;
  
  // Calculate average time per character based on WPM
  // WPM = (characters / 5) / (time in minutes)
  // time per char (ms) = (60000 / WPM) / 5
  const avgTimePerChar = (60000 / baseWPM) / 5;
  
  targetWords.forEach((targetWord, wordIndex) => {
    const typedWord = typedWords[wordIndex] || '';
    
    // Type each character of the typed word
    for (let charIndex = 0; charIndex < typedWord.length; charIndex++) {
      const typedChar = typedWord[charIndex];
      const expectedChar = targetWord[charIndex];
      const wasCorrect = typedChar === expectedChar;
      
      // Add some randomness to timing (±30%)
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
      
      // Sometimes add corrections (backspace + retype)
      if (!wasCorrect && Math.random() < 0.5) {
        timestamp += avgTimePerChar * 0.5;
        events.push({
          timestamp,
          key: 'Backspace',
          wordIndex,
          charIndex,
          expectedChar,
          wasCorrect: false,
          isBackspace: true,
        });
        
        timestamp += avgTimePerChar;
        events.push({
          timestamp,
          key: expectedChar || typedChar,
          wordIndex,
          charIndex,
          expectedChar,
          wasCorrect: true,
          isBackspace: false,
        });
      }
    }
    
    // Add space after word (except last word)
    if (wordIndex < targetWords.length - 1) {
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
  });
  
  return events;
}

/**
 * Generate typed words based on target words and accuracy
 */
function generateTypedWords(targetWords: string[], accuracy: number): string[] {
  return targetWords.map(word => {
    let typedWord = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      // Determine if this character should be correct based on accuracy
      if (Math.random() * 100 < accuracy) {
        typedWord += char;
      } else {
        // Make a mistake - use common substitution or random char
        const mistakes = COMMON_MISTAKES[char] || ['a', 'e', 'i', 'o', 'u'];
        typedWord += mistakes[Math.floor(Math.random() * mistakes.length)];
      }
    }
    return typedWord;
  });
}

/**
 * Calculate character substitutions from keystroke events
 */
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

/**
 * Generate a single fake test result
 */
function generateFakeTestResult(userId: string, createdAt: Date): TestResult {
  // Randomize test parameters
  const baseWPM = 40 + Math.random() * 60; // 40-100 WPM
  const accuracy = 85 + Math.random() * 14; // 85-99% accuracy
  const duration = 30; // 30 second test
  
  // Generate target words
  const wordsPerTest = Math.floor((baseWPM * duration) / 60) + Math.floor(Math.random() * 10);
  const targetWords = generateWords(wordsPerTest);
  
  // Generate typed words based on accuracy
  const typedWords = generateTypedWords(targetWords, accuracy);
  
  // Calculate stats
  const correctWordCount = targetWords.filter((word, i) => word === typedWords[i]).length;
  const incorrectWordCount = targetWords.length - correctWordCount;
  
  // Generate keystroke events
  const errorRate = 1 - (accuracy / 100);
  const keystrokeTimings = generateKeystrokeEvents(targetWords, typedWords, baseWPM, errorRate);
  
  // Calculate mistake data
  const mistakeEvents = keystrokeTimings.filter(e => !e.wasCorrect && !e.isBackspace);
  const correctionEvents = keystrokeTimings.filter(e => e.isBackspace);
  const characterSubstitutions = calculateCharacterSubstitutions(keystrokeTimings);
  
  // Randomly decide if this is a practice test
  const isPractice = Math.random() < 0.15; // 15% are practice tests
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
 * Save test result to Firebase (bypassing auth check)
 */
async function saveTestResultDirect(result: TestResult): Promise<void> {
  try {
    const db = getFirebaseDb();
    const resultRef = doc(db, 'testResults', result.id);
    
    // Convert to Firestore format
    const firestoreData = {
      ...result,
      createdAt: Timestamp.fromDate(result.createdAt),
    };
    
    await setDoc(resultRef, firestoreData);
    console.log(`✓ Saved test result ${result.id} (${result.createdAt.toLocaleDateString()}, ${result.wpm} WPM, ${result.accuracy}% acc)`);
  } catch (error) {
    console.error(`✗ Failed to save test result ${result.id}:`, error);
    throw error;
  }
}

/**
 * Main function to seed fake data
 */
async function seedFakeData() {
  console.log('🌱 Starting to seed fake data...\n');
  
  // Get current authenticated user
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.error('❌ No authenticated user found. Please log in first.');
    process.exit(1);
  }
  
  console.log(`📝 Generating data for user: ${currentUser.email} (${currentUser.uid})\n`);
  
  // Generate test results for the last 90 days
  const daysToGenerate = 90;
  const testsPerDay = 2 + Math.floor(Math.random() * 4); // 2-5 tests per day
  const totalTests = daysToGenerate * testsPerDay;
  
  console.log(`📊 Generating ${totalTests} test results over ${daysToGenerate} days...\n`);
  
  const results: TestResult[] = [];
  
  // Generate results
  for (let i = 0; i < totalTests; i++) {
    const createdAt = randomDateInLastNDays(daysToGenerate);
    const result = generateFakeTestResult(currentUser.uid, createdAt);
    results.push(result);
  }
  
  // Sort by date (oldest first)
  results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  
  // Save to Firebase
  console.log('💾 Saving to Firebase...\n');
  
  for (const result of results) {
    await saveTestResultDirect(result);
  }
  
  console.log('\n✅ Successfully seeded fake data!');
  console.log(`\n📈 Summary:`);
  console.log(`   - Total tests: ${totalTests}`);
  console.log(`   - Date range: ${results[0].createdAt.toLocaleDateString()} to ${results[results.length - 1].createdAt.toLocaleDateString()}`);
  console.log(`   - Average WPM: ${Math.round(results.reduce((sum, r) => sum + r.wpm, 0) / results.length)}`);
  console.log(`   - Average accuracy: ${Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length)}%`);
  
  process.exit(0);
}

// Run the script
seedFakeData().catch(error => {
  console.error('❌ Error seeding data:', error);
  process.exit(1);
});

