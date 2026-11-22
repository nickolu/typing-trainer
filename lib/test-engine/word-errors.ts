import { KeystrokeEvent } from '@/lib/types';

export interface WordErrorCount {
  word: string;   // normalized word
  count: number;  // number of errors attributed to this word in a single test
}

export interface WordErrorEntry {
  errorCount: number;    // total errors across all tests
  lastSeenAt: number;    // unix timestamp ms of most recent mistake
}

export const MAX_WORD_ERROR_ENTRIES = 500;

/** Lowercase and strip leading/trailing punctuation. Returns '' if the word should be skipped. */
export function normalizeWord(word: string): string {
  const normalized = word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return normalized.length < 2 ? '' : normalized;
}

/**
 * Words that had at least one error in a test, including typos that were later corrected.
 * Count = wrong keystrokes in the word (space/Tab excluded); a backspace alone counts as 1.
 */
export function wordsWithErrors(
  keystrokes: KeystrokeEvent[],
  targetWords: string[]
): WordErrorCount[] {
  const perWord = new Map<number, { wrong: number; backspaced: boolean }>();

  for (const ks of keystrokes) {
    const info = perWord.get(ks.wordIndex) ?? { wrong: 0, backspaced: false };
    if (ks.isBackspace) {
      info.backspaced = true;
    } else if (!ks.wasCorrect && ks.key !== ' ' && ks.key !== 'Tab') {
      info.wrong += 1;
    }
    perWord.set(ks.wordIndex, info);
  }

  const merged = new Map<string, number>();
  for (const [wordIndex, info] of perWord) {
    const count = info.wrong > 0 ? info.wrong : info.backspaced ? 1 : 0;
    if (count === 0) continue;
    const target = targetWords[wordIndex];
    if (!target) continue;
    const word = normalizeWord(target);
    if (!word) continue;
    merged.set(word, (merged.get(word) ?? 0) + count);
  }

  return Array.from(merged, ([word, count]) => ({ word, count }));
}

/** Merge a test's word errors into existing stats (pure; returns a new object). */
export function mergeWordErrors(
  existing: Record<string, WordErrorEntry>,
  errors: WordErrorCount[],
  now: number
): Record<string, WordErrorEntry> {
  const merged = { ...existing };
  for (const { word, count } of errors) {
    if (!word) continue;
    merged[word] = {
      errorCount: (merged[word]?.errorCount ?? 0) + count,
      lastSeenAt: now,
    };
  }
  return merged;
}

/** Keep the MAX most significant words: evict lowest errorCount first, then oldest lastSeenAt. */
export function evictWordErrors(
  words: Record<string, WordErrorEntry>,
  max: number = MAX_WORD_ERROR_ENTRIES
): Record<string, WordErrorEntry> {
  const entries = Object.entries(words);
  if (entries.length <= max) return words;
  entries.sort(([, a], [, b]) => {
    if (a.errorCount !== b.errorCount) return a.errorCount - b.errorCount;
    return a.lastSeenAt - b.lastSeenAt;
  });
  return Object.fromEntries(entries.slice(entries.length - max));
}

/** Rank by errorCount desc, then lastSeenAt desc. */
export function rankWordErrors(
  words: Record<string, WordErrorEntry>,
  topN: number
): Array<{ word: string; entry: WordErrorEntry }> {
  return Object.entries(words)
    .sort(([, a], [, b]) => {
      if (b.errorCount !== a.errorCount) return b.errorCount - a.errorCount;
      return b.lastSeenAt - a.lastSeenAt;
    })
    .slice(0, topN)
    .map(([word, entry]) => ({ word, entry }));
}
