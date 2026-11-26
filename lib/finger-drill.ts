/**
 * Generates typing drills for finger analysis.
 *
 * - "balanced" drills spread keystrokes evenly across all eight letter fingers so that
 *   every finger reaches a reliable sample size at about the same time.
 * - "targeted" drills weight word selection toward the fingers you want to work on,
 *   while keeping ~25% ordinary words so the text still reads like typing, not a chore.
 *
 * Words come from real English prose already in the app's static test library.
 */

import { staticTests } from '@/lib/test-content';
import { FingerId, LETTER_FINGERS, getFingerForChar } from '@/lib/finger-map';

export type DrillMode = 'balanced' | 'targeted';

export interface DrillOptions {
  mode: DrillMode;
  wordCount: number;
  /** Fingers to emphasise in targeted mode. Ignored for balanced. */
  targetFingers?: FingerId[];
  /** Deterministic source of randomness for tests. Defaults to Math.random. */
  random?: () => number;
}

export interface DrillWord {
  word: string;
  fingerCounts: Partial<Record<FingerId, number>>;
}

let cachedPool: DrillWord[] | null = null;

/** Unique lowercase alphabetic words (3-10 letters) harvested from the static test library. */
export function getWordPool(): DrillWord[] {
  if (cachedPool) return cachedPool;
  const seen = new Set<string>();
  const pool: DrillWord[] = [];
  for (const test of staticTests) {
    if (test.category.startsWith('code-') || test.category === 'special-chars') continue;
    for (const raw of test.text.split(/\s+/)) {
      const word = raw.toLowerCase().replace(/[^a-z]/g, '');
      if (word.length < 3 || word.length > 10 || seen.has(word)) continue;
      seen.add(word);
      pool.push({ word, fingerCounts: countFingers(word) });
    }
  }
  cachedPool = pool;
  return pool;
}

export function countFingers(word: string): Partial<Record<FingerId, number>> {
  const counts: Partial<Record<FingerId, number>> = {};
  for (const ch of word) {
    const finger = getFingerForChar(ch);
    if (!finger) continue;
    counts[finger] = (counts[finger] ?? 0) + 1;
  }
  return counts;
}

/** Fraction of a word's letters typed by any of the given fingers. */
export function fingerShare(word: DrillWord, fingers: FingerId[]): number {
  let hit = 0;
  let total = 0;
  for (const [finger, n] of Object.entries(word.fingerCounts) as Array<[FingerId, number]>) {
    total += n;
    if (fingers.includes(finger)) hit += n;
  }
  return total === 0 ? 0 : hit / total;
}

export function generateFingerDrill(options: DrillOptions): string[] {
  const random = options.random ?? Math.random;
  const pool = getWordPool();
  if (pool.length === 0 || options.wordCount <= 0) return [];

  if (options.mode === 'targeted' && options.targetFingers && options.targetFingers.length > 0) {
    return generateTargeted(pool, options.wordCount, options.targetFingers, random);
  }
  return generateBalanced(pool, options.wordCount, random);
}

/**
 * Greedy balancing: from a random sample of candidates, pick the word that most helps
 * the fingers currently furthest behind. Keeps the running per-finger totals close.
 */
function generateBalanced(pool: DrillWord[], wordCount: number, random: () => number): string[] {
  const totals: Record<FingerId, number> = Object.fromEntries(
    LETTER_FINGERS.map((f) => [f, 0])
  ) as Record<FingerId, number>;
  const words: string[] = [];
  const CANDIDATES = 40;

  for (let i = 0; i < wordCount; i++) {
    let best: DrillWord | null = null;
    let bestGain = -Infinity;
    for (let c = 0; c < CANDIDATES; c++) {
      const candidate = pool[Math.floor(random() * pool.length)];
      // Reward letters on under-used fingers, strongly: weight each letter by 1 / (count + 1)^2,
      // and normalise by word length so long words don't win just by having more letters.
      let gain = 0;
      let letters = 0;
      for (const [finger, n] of Object.entries(candidate.fingerCounts) as Array<[FingerId, number]>) {
        if (!(finger in totals)) continue;
        gain += n / (totals[finger] + 1) ** 2;
        letters += n;
      }
      if (letters > 0) gain /= letters;
      if (gain > bestGain) {
        bestGain = gain;
        best = candidate;
      }
    }
    if (!best) break;
    words.push(best.word);
    for (const [finger, n] of Object.entries(best.fingerCounts) as Array<[FingerId, number]>) {
      if (finger in totals) totals[finger] += n;
    }
  }
  return words;
}

/**
 * Targeted: ~75% of words come from the 150 words in the pool whose letters lean hardest
 * on the target fingers; the rest are ordinary words so the drill still flows.
 */
function generateTargeted(
  pool: DrillWord[],
  wordCount: number,
  targetFingers: FingerId[],
  random: () => number
): string[] {
  const RICH_POOL_SIZE = 150;
  const RICH_FRACTION = 0.75;
  const rich = [...pool]
    .map((w) => ({ w, share: fingerShare(w, targetFingers), tiebreak: random() }))
    .filter((e) => e.share > 0)
    .sort((a, b) => b.share - a.share || a.tiebreak - b.tiebreak)
    .slice(0, RICH_POOL_SIZE)
    .map((e) => e.w);
  if (rich.length === 0) return generateBalanced(pool, wordCount, random);

  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const source = random() < RICH_FRACTION ? rich : pool;
    words.push(source[Math.floor(random() * source.length)].word);
  }
  return words;
}
