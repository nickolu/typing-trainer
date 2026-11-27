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
 * Error count per word index from a test's keystrokes, including typos that were later
 * corrected. Count = wrong keystrokes in the word (space/Tab excluded); a backspace alone
 * counts as 1. Words with no errors are absent.
 */
export function errorsByWordIndex(keystrokes: KeystrokeEvent[]): Map<number, number> {
  const perWord = new Map<number, { wrong: number; backspaced: boolean; typed: boolean }>();

  for (const ks of keystrokes) {
    const info = perWord.get(ks.wordIndex) ?? { wrong: 0, backspaced: false, typed: false };
    if (ks.isBackspace) {
      // A backspace on an empty input is recorded against the word being left, which was
      // never typed into; only count it if this word already had a typed keystroke.
      if (info.typed) info.backspaced = true;
    } else if (!ks.wasCorrect && ks.key !== ' ' && ks.key !== 'Tab') {
      info.wrong += 1;
    }
    if (!ks.isBackspace) info.typed = true;
    perWord.set(ks.wordIndex, info);
  }

  const counts = new Map<number, number>();
  for (const [wordIndex, info] of perWord) {
    const count = info.wrong > 0 ? info.wrong : info.backspaced ? 1 : 0;
    if (count > 0) counts.set(wordIndex, count);
  }
  return counts;
}

/**
 * Words that had at least one error in a test, including typos that were later corrected.
 * Count = wrong keystrokes in the word (space/Tab excluded); a backspace alone counts as 1.
 */
export function wordsWithErrors(
  keystrokes: KeystrokeEvent[],
  targetWords: string[]
): WordErrorCount[] {
  const merged = new Map<string, number>();
  for (const [wordIndex, count] of errorsByWordIndex(keystrokes)) {
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

export interface ProblemWordSummary {
  word: string;       // normalized word
  count: number;      // times the word was mistyped (once per occurrence in a test)
  lastSeenAt: number; // createdAt (ms) of the most recent test it was mistyped in
}

/** The parts of a TestResult that problemWordsFromResults reads. */
export interface ProblemWordSource {
  targetWords?: string[];
  typedWords?: string[];
  keystrokeTimings?: KeystrokeEvent[];
  createdAt: Date | string | number;
}

/**
 * Words mistyped across a set of test results, most-missed first.
 *
 * An occurrence of a word counts once if it had any wrong keystroke (even if corrected)
 * or if the word as finally typed differs from the target. Words the test never reached,
 * and a trailing word the timer cut off mid-way, don't count. Needs `targetWords` on each
 * result (see hydrateTargetWords); results without them are skipped.
 */
export function problemWordsFromResults(results: ProblemWordSource[]): ProblemWordSummary[] {
  const summaries = new Map<string, ProblemWordSummary>();

  for (const result of results) {
    const targetWords = result.targetWords;
    if (!targetWords || targetWords.length === 0) continue;
    const typedWords = result.typedWords ?? [];
    const seenAtRaw = new Date(result.createdAt).getTime();
    const seenAt = Number.isFinite(seenAtRaw) ? seenAtRaw : 0;

    const errorIndices = new Set(errorsByWordIndex(result.keystrokeTimings ?? []).keys());
    typedWords.forEach((typed, i) => {
      const target = targetWords[i];
      if (!typed || !target || typed === target) return;
      // The last typed word of a timed test is usually cut off by the timer, not mistyped.
      if (i === typedWords.length - 1 && target.startsWith(typed)) return;
      errorIndices.add(i);
    });

    for (const i of errorIndices) {
      const word = normalizeWord(targetWords[i] ?? '');
      if (!word) continue;
      const existing = summaries.get(word);
      if (existing) {
        existing.count += 1;
        existing.lastSeenAt = Math.max(existing.lastSeenAt, seenAt);
      } else {
        summaries.set(word, { word, count: 1, lastSeenAt: seenAt });
      }
    }
  }

  return Array.from(summaries.values()).sort((a, b) =>
    b.count !== a.count ? b.count - a.count : b.lastSeenAt - a.lastSeenAt
  );
}
