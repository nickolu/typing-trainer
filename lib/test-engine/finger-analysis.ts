/**
 * Finger-level analysis of keystroke timing data.
 *
 * Every keystroke the app records carries a performance.now() timestamp, the typed key,
 * and the expected character. From that we derive, per finger and per key:
 *   - speed: the inter-key interval (time from the previous keystroke to this one),
 *     attributed to the finger that typed this key
 *   - accuracy: error rate, attributed to the finger that SHOULD have typed the key
 *
 * Medians are used throughout because interval distributions are heavily right-skewed
 * (pauses, hesitations). A 95% confidence interval on the median tells us when a finger
 * is slower than the overall median by more than noise, which is how we decide whether
 * we have "enough data".
 */

import { KeystrokeEvent } from '@/lib/types';
import {
  FingerId,
  FINGERS,
  FINGER_ORDER,
  LETTER_FINGERS,
  getFingerForChar,
  getPhysicalKey,
} from '@/lib/finger-map';

/** Intervals longer than this are treated as pauses, not finger speed. */
export const MAX_INTERVAL_MS = 1500;
/** Below this the event is almost certainly a key repeat or two keys rolled together. */
export const MIN_INTERVAL_MS = 20;
/** Timed samples per finger before we call the finger's estimate reliable. */
export const TARGET_SAMPLES_PER_FINGER = 150;
/** Fewer than this and we don't report a median at all. */
export const MIN_SAMPLES_FOR_ESTIMATE = 15;

export interface FingerStat {
  id: FingerId;
  hand: 'L' | 'R';
  name: string;
  shortName: string;
  samples: number; // timed intervals
  medianMs: number | null;
  meanMs: number | null;
  ci95Ms: number | null; // half-width of the 95% CI on the median
  attempts: number; // keystrokes this finger should have typed
  errors: number; // of those, how many were wrong
  accuracy: number | null; // 0-100
  /** overallMedian / medianMs. 1 = average, >1 faster, <1 slower. */
  relativeSpeed: number | null;
  /** 0..1 progress toward TARGET_SAMPLES_PER_FINGER */
  confidence: number;
  /** True when the CI on this finger's median sits entirely above the overall median. */
  significantlySlow: boolean;
  /** True when the CI sits entirely below the overall median. */
  significantlyFast: boolean;
  /** Composite 0-100: speed relative to the user's own average, penalised by error rate. */
  score: number | null;
  slowestKeys: KeyStat[];
}

export interface KeyStat {
  char: string; // the unshifted key character
  finger: FingerId;
  samples: number;
  medianMs: number | null;
  attempts: number;
  errors: number;
  accuracy: number | null;
  relativeSpeed: number | null;
}

export interface FingerReport {
  fingers: FingerStat[]; // in FINGER_ORDER
  keys: KeyStat[];
  totalSamples: number;
  totalKeystrokes: number;
  overallMedianMs: number | null;
  /** Min confidence across letter fingers (thumbs excluded). */
  readiness: number;
  /** Letter fingers still below TARGET_SAMPLES_PER_FINGER. */
  fingersNeedingData: FingerId[];
  testsAnalyzed: number;
}

interface Accumulator {
  intervals: number[];
  attempts: number;
  errors: number;
}

function newAccumulator(): Accumulator {
  return { intervals: [], attempts: 0, errors: 0 };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Half-width of an approximate 95% confidence interval on the median.
 * Uses the large-sample normal approximation: SE(median) ~= 1.2533 * sd / sqrt(n).
 */
function medianCi95(values: number[]): number | null {
  if (values.length < MIN_SAMPLES_FOR_ESTIMATE) return null;
  const m = mean(values)!;
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  const sd = Math.sqrt(variance);
  return 1.96 * 1.2533 * (sd / Math.sqrt(values.length));
}

/**
 * Pull (finger, interval) and (finger, correct?) observations out of one test's keystrokes.
 * Exported so a single result can be analyzed on its own.
 */
export function collectObservations(
  keystrokes: KeystrokeEvent[],
  fingerAcc: Map<FingerId, Accumulator>,
  keyAcc: Map<string, Accumulator>
): { samples: number; keystrokes: number } {
  let samples = 0;
  let counted = 0;

  for (let i = 0; i < keystrokes.length; i++) {
    const k = keystrokes[i];
    if (k.isBackspace || k.key.length !== 1) continue;

    // Accuracy is attributed to the finger that should have typed the expected character.
    const expected = k.expectedChar ?? (k.wasCorrect ? k.key : undefined);
    if (!expected) continue;
    const physical = getPhysicalKey(expected);
    if (!physical) continue;

    counted++;
    const fa = fingerAcc.get(physical.finger) ?? newAccumulator();
    fa.attempts++;
    if (!k.wasCorrect) fa.errors++;
    fingerAcc.set(physical.finger, fa);

    const ka = keyAcc.get(physical.base) ?? newAccumulator();
    ka.attempts++;
    if (!k.wasCorrect) ka.errors++;
    keyAcc.set(physical.base, ka);

    // Speed only counts correct keystrokes that followed another plain keystroke.
    if (!k.wasCorrect || i === 0) continue;
    const prev = keystrokes[i - 1];
    if (prev.isBackspace || prev.key.length !== 1) continue;
    const interval = k.timestamp - prev.timestamp;
    if (!(interval >= MIN_INTERVAL_MS && interval <= MAX_INTERVAL_MS)) continue;

    fa.intervals.push(interval);
    ka.intervals.push(interval);
    samples++;
  }

  return { samples, keystrokes: counted };
}

/**
 * Build the full finger report from any number of tests' keystroke arrays.
 */
export function analyzeFingers(keystrokeSets: KeystrokeEvent[][]): FingerReport {
  const fingerAcc = new Map<FingerId, Accumulator>();
  const keyAcc = new Map<string, Accumulator>();
  let totalSamples = 0;
  let totalKeystrokes = 0;

  for (const keystrokes of keystrokeSets) {
    if (!keystrokes || keystrokes.length === 0) continue;
    const { samples, keystrokes: counted } = collectObservations(keystrokes, fingerAcc, keyAcc);
    totalSamples += samples;
    totalKeystrokes += counted;
  }

  const allIntervals: number[] = [];
  fingerAcc.forEach((acc) => allIntervals.push(...acc.intervals));
  const overallMedianMs = median(allIntervals);

  const keys: KeyStat[] = Array.from(keyAcc.entries()).map(([char, acc]) => {
    const med = acc.intervals.length >= MIN_SAMPLES_FOR_ESTIMATE ? median(acc.intervals) : null;
    return {
      char,
      finger: getFingerForChar(char)!,
      samples: acc.intervals.length,
      medianMs: med,
      attempts: acc.attempts,
      errors: acc.errors,
      accuracy: acc.attempts > 0 ? round1(((acc.attempts - acc.errors) / acc.attempts) * 100) : null,
      relativeSpeed: med && overallMedianMs ? round3(overallMedianMs / med) : null,
    };
  });

  const fingers: FingerStat[] = FINGER_ORDER.map((id) => {
    const acc = fingerAcc.get(id) ?? newAccumulator();
    const info = FINGERS[id];
    const enough = acc.intervals.length >= MIN_SAMPLES_FOR_ESTIMATE;
    const med = enough ? median(acc.intervals) : null;
    const ci = enough ? medianCi95(acc.intervals) : null;
    const accuracy = acc.attempts > 0 ? ((acc.attempts - acc.errors) / acc.attempts) * 100 : null;
    const relativeSpeed = med && overallMedianMs ? overallMedianMs / med : null;

    let score: number | null = null;
    if (relativeSpeed !== null && accuracy !== null) {
      // 1.0 relative speed -> 50. Each 10% faster adds ~5 points. Errors subtract 2 points per percent.
      const speedPart = 50 + (relativeSpeed - 1) * 50;
      const errorPenalty = (100 - accuracy) * 2;
      score = clamp(Math.round(speedPart - errorPenalty), 0, 100);
    }

    const slowestKeys = keys
      .filter((k) => k.finger === id && k.medianMs !== null)
      .sort((a, b) => b.medianMs! - a.medianMs!)
      .slice(0, 3);

    return {
      id,
      hand: info.hand,
      name: info.name,
      shortName: info.shortName,
      samples: acc.intervals.length,
      medianMs: med === null ? null : Math.round(med),
      meanMs: enough ? Math.round(mean(acc.intervals)!) : null,
      ci95Ms: ci === null ? null : Math.round(ci),
      attempts: acc.attempts,
      errors: acc.errors,
      accuracy: accuracy === null ? null : round1(accuracy),
      relativeSpeed: relativeSpeed === null ? null : round3(relativeSpeed),
      confidence: Math.min(1, acc.intervals.length / TARGET_SAMPLES_PER_FINGER),
      significantlySlow: med !== null && ci !== null && overallMedianMs !== null && med - ci > overallMedianMs,
      significantlyFast: med !== null && ci !== null && overallMedianMs !== null && med + ci < overallMedianMs,
      score,
      slowestKeys,
    };
  });

  const letterFingerStats = fingers.filter((f) => LETTER_FINGERS.includes(f.id));
  const readiness = Math.min(...letterFingerStats.map((f) => f.confidence));
  const fingersNeedingData = letterFingerStats.filter((f) => f.confidence < 1).map((f) => f.id);

  return {
    fingers,
    keys: keys.sort((a, b) => (b.medianMs ?? 0) - (a.medianMs ?? 0)),
    totalSamples,
    totalKeystrokes,
    overallMedianMs: overallMedianMs === null ? null : Math.round(overallMedianMs),
    readiness,
    fingersNeedingData,
    testsAnalyzed: keystrokeSets.filter((k) => k && k.length > 0).length,
  };
}

/** Letter fingers ranked weakest first by score; fingers without an estimate are excluded. */
export function rankWeakestFingers(report: FingerReport, limit: number = 3): FingerStat[] {
  return report.fingers
    .filter((f) => LETTER_FINGERS.includes(f.id) && f.score !== null)
    .sort((a, b) => a.score! - b.score!)
    .slice(0, limit);
}

/** Letter fingers ranked strongest first. */
export function rankStrongestFingers(report: FingerReport, limit: number = 3): FingerStat[] {
  return report.fingers
    .filter((f) => LETTER_FINGERS.includes(f.id) && f.score !== null)
    .sort((a, b) => b.score! - a.score!)
    .slice(0, limit);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
