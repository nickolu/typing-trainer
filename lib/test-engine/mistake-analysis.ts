import { KeystrokeEvent } from '@/lib/types';

/**
 * Mistake sequence (2 or 3 character sequence that contains mistakes)
 */
export interface MistakeSequence {
  sequence: string;
  frequency: number;
  mistakePositions: number[]; // Which positions in the sequence had mistakes
}

/**
 * Character substitution pattern (typed X instead of Y)
 */
export interface CharacterSubstitution {
  expected: string;
  actual: string;
  count: number;
}

/**
 * Commonly mistyped word
 */
export interface MistypedWord {
  target: string;
  typed: string;
  count: number;
}

/**
 * Complete mistake analysis result
 */
export interface MistakeAnalysis {
  totalMistakes: number;
  totalCorrections: number;
  mistakeRate: number; // Percentage of keystrokes that were mistakes
  characterSubstitutions: CharacterSubstitution[];
  mistakeSequences: MistakeSequence[];
  commonMistypedWords: MistypedWord[];
}

/**
 * Analyze all mistakes from keystroke data
 */
export function analyzeMistakes(
  keystrokes: KeystrokeEvent[],
  targetWords: string[],
  typedWords: string[]
): MistakeAnalysis {
  // Count mistakes and corrections
  let totalMistakes = 0;
  let totalCorrections = 0;
  const totalKeystrokes = keystrokes.length;

  // Track character substitutions
  const substitutionMap = new Map<string, Map<string, number>>();

  // Track mistakes by word
  const wordMistakes = new Map<string, Map<string, number>>();

  // Analyze each keystroke
  for (const keystroke of keystrokes) {
    if (keystroke.isBackspace) {
      totalCorrections++;
    } else if (!keystroke.wasCorrect && keystroke.key !== ' ' && keystroke.key !== 'Tab') {
      totalMistakes++;

      // Track character substitution
      if (keystroke.expectedChar && keystroke.key) {
        if (!substitutionMap.has(keystroke.expectedChar)) {
          substitutionMap.set(keystroke.expectedChar, new Map());
        }
        const actualMap = substitutionMap.get(keystroke.expectedChar)!;
        actualMap.set(keystroke.key, (actualMap.get(keystroke.key) || 0) + 1);
      }
    }
  }

  // Analyze mistyped words
  for (let i = 0; i < Math.min(targetWords.length, typedWords.length); i++) {
    const target = targetWords[i];
    const typed = typedWords[i];

    if (target && typed && target !== typed && typed.length > 0) {
      if (!wordMistakes.has(target)) {
        wordMistakes.set(target, new Map());
      }
      const typedMap = wordMistakes.get(target)!;
      typedMap.set(typed, (typedMap.get(typed) || 0) + 1);
    }
  }

  // Convert character substitutions to array
  const characterSubstitutions: CharacterSubstitution[] = [];
  substitutionMap.forEach((actualMap, expected) => {
    actualMap.forEach((count, actual) => {
      characterSubstitutions.push({ expected, actual, count });
    });
  });

  // Sort by frequency
  characterSubstitutions.sort((a, b) => b.count - a.count);

  // Find mistake sequences (2-char and 3-char)
  const mistakeSequences = findMistakeSequences(keystrokes, 2)
    .concat(findMistakeSequences(keystrokes, 3))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Convert word mistakes to array
  const commonMistypedWords: MistypedWord[] = [];
  wordMistakes.forEach((typedMap, target) => {
    typedMap.forEach((count, typed) => {
      commonMistypedWords.push({ target, typed, count });
    });
  });

  // Sort by frequency
  commonMistypedWords.sort((a, b) => b.count - a.count);

  // Calculate mistake rate
  const mistakeRate = totalKeystrokes > 0 ? (totalMistakes / totalKeystrokes) * 100 : 0;

  return {
    totalMistakes,
    totalCorrections,
    mistakeRate: Math.round(mistakeRate * 10) / 10,
    characterSubstitutions: characterSubstitutions.slice(0, 10), // Top 10
    mistakeSequences,
    commonMistypedWords: commonMistypedWords.slice(0, 10), // Top 10
  };
}

/**
 * Find sequences that contain mistakes
 */
function findMistakeSequences(
  keystrokes: KeystrokeEvent[],
  sequenceLength: number
): MistakeSequence[] {
  // Filter to only typed characters (not backspace, tab, etc.)
  const typedKeystrokes = keystrokes.filter(
    (k) => k.key.length === 1 && !k.isBackspace
  );

  if (typedKeystrokes.length < sequenceLength) {
    return [];
  }

  const sequenceMap = new Map<string, { count: number; mistakePositions: Set<number> }>();

  // Process sequences
  for (let i = 0; i < typedKeystrokes.length - sequenceLength + 1; i++) {
    const sequenceKeys = typedKeystrokes.slice(i, i + sequenceLength);
    const sequence = sequenceKeys.map((k) => k.key).join('');

    // Check if any keystroke in the sequence was a mistake
    const hasMistake = sequenceKeys.some((k) => !k.wasCorrect);

    if (hasMistake) {
      // Find which positions had mistakes
      const mistakePositions: number[] = [];
      sequenceKeys.forEach((k, idx) => {
        if (!k.wasCorrect) {
          mistakePositions.push(idx);
        }
      });

      if (!sequenceMap.has(sequence)) {
        sequenceMap.set(sequence, { count: 0, mistakePositions: new Set() });
      }

      const data = sequenceMap.get(sequence)!;
      data.count++;
      mistakePositions.forEach((pos) => data.mistakePositions.add(pos));
    }
  }

  // Convert to array
  const results: MistakeSequence[] = [];
  sequenceMap.forEach((data, sequence) => {
    results.push({
      sequence,
      frequency: data.count,
      mistakePositions: Array.from(data.mistakePositions).sort(),
    });
  });

  return results;
}

/**
 * Get most common mistake patterns across all tests (for aggregate analysis)
 */
export function getMistakeSequencesForPractice(
  analysis: MistakeAnalysis,
  maxSequences: number = 5
): string[] {
  // Combine character substitutions and mistake sequences
  const practiceTargets: Array<{ text: string; score: number }> = [];

  // Add top character substitutions as 2-char sequences
  for (const sub of analysis.characterSubstitutions.slice(0, 3)) {
    practiceTargets.push({
      text: sub.expected + sub.actual,
      score: sub.count * 2, // Weight substitutions higher
    });
  }

  // Add mistake sequences
  for (const seq of analysis.mistakeSequences) {
    practiceTargets.push({
      text: seq.sequence,
      score: seq.frequency,
    });
  }

  // Sort by score and take top N unique sequences
  const uniqueSequences = new Set<string>();
  const result: string[] = [];

  practiceTargets.sort((a, b) => b.score - a.score);

  for (const target of practiceTargets) {
    if (!uniqueSequences.has(target.text) && result.length < maxSequences) {
      uniqueSequences.add(target.text);
      result.push(target.text);
    }
  }

  return result;
}
