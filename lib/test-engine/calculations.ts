import { KeystrokeEvent } from '@/lib/types';

/**
 * Calculate Words Per Minute (WPM)
 * Only counts correctly typed words
 * Standard: 5 characters = 1 word
 */
export function calculateWPM(
  targetWords: string[],
  typedWords: string[],
  durationSeconds: number
): number {
  // Only count correctly typed words
  let correctChars = 0;

  for (let i = 0; i < targetWords.length; i++) {
    const targetWord = targetWords[i] || '';
    const typedWord = typedWords[i] || '';

    // Only count this word if it was typed correctly
    if (targetWord === typedWord) {
      correctChars += targetWord.length;
      // Add space between words (except for the last word)
      if (i < targetWords.length - 1) {
        correctChars += 1;
      }
    }
  }

  // Convert to "words" (5 chars = 1 word)
  const words = correctChars / 5;

  // Convert duration to minutes
  const minutes = durationSeconds / 60;

  // Calculate WPM (prevent division by zero)
  const wpm = minutes > 0 ? words / minutes : 0;

  return Math.round(wpm);
}

/**
 * Calculate typing accuracy
 * Compares target words with typed words
 */
export function calculateAccuracy(
  targetWords: string[],
  typedWords: string[]
): {
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  totalTyped: number;
} {
  let correctCount = 0;
  let incorrectCount = 0;

  // Compare each word
  for (let i = 0; i < targetWords.length; i++) {
    const targetWord = targetWords[i] || '';
    const typedWord = typedWords[i] || '';

    if (typedWord.length === 0) {
      // Word not typed, skip it
      continue;
    }

    if (targetWord === typedWord) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  }

  const totalTyped = correctCount + incorrectCount;
  const accuracy = totalTyped > 0 ? (correctCount / totalTyped) * 100 : 0;

  return {
    accuracy: Math.round(accuracy * 10) / 10, // Round to 1 decimal place
    correctCount,
    incorrectCount,
    totalTyped,
  };
}

/**
 * Check if current input has an error compared to target
 */
export function hasInputError(input: string, target: string): boolean {
  // Check each character
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== target[i]) {
      return true;
    }
  }
  return false;
}

/**
 * Get character-by-character comparison for display
 */
export interface CharacterComparison {
  char: string;
  status: 'correct' | 'incorrect' | 'pending';
}

export function compareWords(
  target: string,
  typed: string
): CharacterComparison[] {
  const result: CharacterComparison[] = [];

  for (let i = 0; i < target.length; i++) {
    const targetChar = target[i];
    const typedChar = typed[i];

    if (typedChar === undefined) {
      // Not yet typed
      result.push({ char: targetChar, status: 'pending' });
    } else if (typedChar === targetChar) {
      // Correct
      result.push({ char: targetChar, status: 'correct' });
    } else {
      // Incorrect
      result.push({ char: typedChar, status: 'incorrect' });
    }
  }

  return result;
}

/**
 * Calculate character sequence timings (for future features)
 * Returns top N slowest sequences
 */
export interface SequenceTiming {
  sequence: string;
  averageTime: number;
  occurrences: number;
}

export function calculateSequenceTimings(
  keystrokes: KeystrokeEvent[],
  targetWords: string[],
  sequenceLength: number,
  topN: number = 10
): SequenceTiming[] {
  // Filter out special keys (Backspace, Tab, etc.)
  // Only keep actual typed characters
  const typedKeystrokes = keystrokes.filter(
    (k) => k.key.length === 1 // Only single characters (includes space)
  );

  if (typedKeystrokes.length < sequenceLength) {
    return []; // Not enough keystrokes to analyze
  }

  // Map to store sequence timings
  const sequenceMap = new Map<string, number[]>();

  // Process keystrokes to find sequences
  for (let i = 0; i < typedKeystrokes.length - sequenceLength + 1; i++) {
    const sequence = typedKeystrokes
      .slice(i, i + sequenceLength)
      .map((k) => k.key)
      .join('');

    // Calculate time difference between first and last keystroke in sequence
    const timeDiff =
      typedKeystrokes[i + sequenceLength - 1].timestamp -
      typedKeystrokes[i].timestamp;

    // Store timing
    if (!sequenceMap.has(sequence)) {
      sequenceMap.set(sequence, []);
    }
    sequenceMap.get(sequence)!.push(timeDiff);
  }

  // Calculate averages and convert to array
  const results: SequenceTiming[] = [];

  sequenceMap.forEach((timings, sequence) => {
    const averageTime =
      timings.reduce((sum, t) => sum + t, 0) / timings.length;
    results.push({
      sequence,
      averageTime: Math.round(averageTime), // Round to nearest ms
      occurrences: timings.length,
    });
  });

  // Sort by slowest first and take top N
  return results
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, topN);
}

/**
 * Validate that typed words array matches expected length
 */
export function normalizeTypedWords(
  targetWords: string[],
  completedWords: string[]
): string[] {
  const result = [...completedWords];

  // Pad with empty strings if user didn't type all words
  while (result.length < targetWords.length) {
    result.push('');
  }

  return result;
}
