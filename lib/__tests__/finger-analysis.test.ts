import { describe, it, expect } from 'vitest';
import { KeystrokeEvent } from '@/lib/types';
import { getFingerForChar, getLettersForFinger, LETTER_FINGERS, FingerId } from '@/lib/finger-map';
import {
  analyzeFingers,
  median,
  rankWeakestFingers,
  MIN_SAMPLES_FOR_ESTIMATE,
  TARGET_SAMPLES_PER_FINGER,
} from '@/lib/test-engine/finger-analysis';
import { generateFingerDrill, countFingers, fingerShare, getWordPool } from '@/lib/finger-drill';

/** Build a keystroke sequence where each char arrives `gap(char)` ms after the previous. */
function typeText(text: string, gap: (ch: string, i: number) => number, start = 1000): KeystrokeEvent[] {
  const events: KeystrokeEvent[] = [];
  let t = start;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i > 0) t += gap(ch, i);
    events.push({
      timestamp: t,
      key: ch,
      wordIndex: 0,
      charIndex: i,
      expectedChar: ch,
      wasCorrect: true,
      isBackspace: false,
    });
  }
  return events;
}

describe('finger map', () => {
  it('maps home row to the standard fingers', () => {
    expect(getFingerForChar('a')).toBe('L5');
    expect(getFingerForChar('s')).toBe('L4');
    expect(getFingerForChar('d')).toBe('L3');
    expect(getFingerForChar('f')).toBe('L2');
    expect(getFingerForChar('g')).toBe('L2');
    expect(getFingerForChar('h')).toBe('R2');
    expect(getFingerForChar('j')).toBe('R2');
    expect(getFingerForChar('k')).toBe('R3');
    expect(getFingerForChar('l')).toBe('R4');
    expect(getFingerForChar(';')).toBe('R5');
    expect(getFingerForChar(' ')).toBe('R1');
  });

  it('maps shifted characters to the same finger as the base key', () => {
    expect(getFingerForChar('Q')).toBe(getFingerForChar('q'));
    expect(getFingerForChar('!')).toBe(getFingerForChar('1'));
    expect(getFingerForChar('?')).toBe(getFingerForChar('/'));
  });

  it('returns undefined for characters not on the layout', () => {
    expect(getFingerForChar('é')).toBeUndefined();
    expect(getFingerForChar('Tab')).toBeUndefined();
  });

  it('lists letters per finger', () => {
    expect(getLettersForFinger('L5').sort()).toEqual(['a', 'q', 'z']);
    expect(getLettersForFinger('R2').sort()).toEqual(['h', 'j', 'm', 'n', 'u', 'y']);
  });
});

describe('median', () => {
  it('handles odd, even and empty inputs', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('analyzeFingers', () => {
  it('attributes inter-key intervals to the finger that typed the key', () => {
    // 'f' (L2) always takes 100ms, 'd' (L3) 200ms, 'j' (R2) 300ms
    const text = 'fdj'.repeat(40);
    const gaps: Record<string, number> = { f: 100, d: 200, j: 300 };
    const keystrokes = typeText(text, (ch) => gaps[ch]);
    const report = analyzeFingers([keystrokes]);

    const l2 = report.fingers.find((f) => f.id === 'L2')!;
    const r2 = report.fingers.find((f) => f.id === 'R2')!;
    expect(l2.medianMs).toBe(100);
    expect(r2.medianMs).toBe(300);
    expect(l2.relativeSpeed!).toBeGreaterThan(r2.relativeSpeed!);
    // Overall median is 200 (the 'd' samples); R2 is clearly slower, L2 clearly faster.
    expect(report.overallMedianMs).toBe(200);
    expect(r2.significantlySlow).toBe(true);
    expect(l2.significantlyFast).toBe(true);
    expect(l2.score!).toBeGreaterThan(r2.score!);
  });

  it('ignores pauses, backspaces and the keystroke after a backspace', () => {
    const base = typeText('ffff', () => 100);
    // Insert a 5 second pause before the last key
    base[3].timestamp = base[2].timestamp + 5000;
    const backspace: KeystrokeEvent = {
      timestamp: base[3].timestamp + 100,
      key: 'Backspace',
      wordIndex: 0,
      charIndex: 3,
      wasCorrect: true,
      isBackspace: true,
    };
    const afterBackspace: KeystrokeEvent = {
      timestamp: backspace.timestamp + 100,
      key: 'f',
      wordIndex: 0,
      charIndex: 3,
      expectedChar: 'f',
      wasCorrect: true,
      isBackspace: false,
    };
    const report = analyzeFingers([[...base, backspace, afterBackspace]]);
    const l2 = report.fingers.find((f) => f.id === 'L2')!;
    // Only the first three 100ms intervals count: f->f, f->f.  (first key has no interval)
    expect(l2.samples).toBe(2);
    expect(report.totalSamples).toBe(2);
  });

  it('attributes errors to the finger that should have typed the key', () => {
    const keystrokes = typeText('aaaa', () => 100);
    // Third keystroke: user typed 's' (L4) when 'a' (L5) was expected
    keystrokes[2] = { ...keystrokes[2], key: 's', wasCorrect: false };
    const report = analyzeFingers([keystrokes]);
    const l5 = report.fingers.find((f) => f.id === 'L5')!;
    const l4 = report.fingers.find((f) => f.id === 'L4')!;
    expect(l5.attempts).toBe(4);
    expect(l5.errors).toBe(1);
    expect(l5.accuracy).toBe(75);
    expect(l4.attempts).toBe(0);
    // Wrong keystrokes contribute no speed sample
    expect(l5.samples).toBe(2);
  });

  it('withholds estimates below the minimum sample size', () => {
    const keystrokes = typeText('f'.repeat(MIN_SAMPLES_FOR_ESTIMATE - 2), () => 100);
    const report = analyzeFingers([keystrokes]);
    const l2 = report.fingers.find((f) => f.id === 'L2')!;
    expect(l2.medianMs).toBeNull();
    expect(l2.score).toBeNull();
    expect(l2.significantlySlow).toBe(false);
  });

  it('reports readiness as the least-covered letter finger', () => {
    const keystrokes = typeText('f'.repeat(TARGET_SAMPLES_PER_FINGER + 10), () => 100);
    const report = analyzeFingers([keystrokes]);
    const l2 = report.fingers.find((f) => f.id === 'L2')!;
    expect(l2.confidence).toBe(1);
    expect(report.readiness).toBe(0);
    expect(report.fingersNeedingData).toHaveLength(LETTER_FINGERS.length - 1);
    expect(report.fingersNeedingData).not.toContain('L2');
  });

  it('ranks weakest fingers by score', () => {
    const text = 'fjk'.repeat(40);
    const gaps: Record<string, number> = { f: 100, j: 200, k: 400 };
    const report = analyzeFingers([typeText(text, (ch) => gaps[ch])]);
    const weakest = rankWeakestFingers(report, 2).map((f) => f.id);
    expect(weakest).toEqual(['R3', 'R2']);
  });

  it('merges data across multiple tests', () => {
    const a = typeText('f'.repeat(20), () => 100);
    const b = typeText('f'.repeat(20), () => 300, 90000);
    const report = analyzeFingers([a, b]);
    const l2 = report.fingers.find((f) => f.id === 'L2')!;
    expect(l2.samples).toBe(38);
    expect(l2.medianMs).toBe(200);
    expect(report.testsAnalyzed).toBe(2);
  });
});

describe('finger drill generator', () => {
  // Simple seeded PRNG so drills are reproducible in tests
  function seeded(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  it('builds a word pool from the static library', () => {
    const pool = getWordPool();
    expect(pool.length).toBeGreaterThan(500);
    expect(pool.every((w) => /^[a-z]{3,10}$/.test(w.word))).toBe(true);
  });

  it('counts fingers per word and computes finger share', () => {
    const counts = countFingers('fad');
    expect(counts.L2).toBe(1);
    expect(counts.L5).toBe(1);
    expect(counts.L3).toBe(1);
    expect(fingerShare({ word: 'fad', fingerCounts: counts }, ['L2'])).toBeCloseTo(1 / 3);
  });

  it('balanced drills keep finger usage within a narrow band', () => {
    const words = generateFingerDrill({ mode: 'balanced', wordCount: 200, random: seeded(7) });
    expect(words).toHaveLength(200);
    const totals: Record<string, number> = {};
    for (const w of words) {
      for (const [finger, n] of Object.entries(countFingers(w))) {
        totals[finger] = (totals[finger] ?? 0) + (n ?? 0);
      }
    }
    const letterTotals = LETTER_FINGERS.map((f) => totals[f] ?? 0);
    const max = Math.max(...letterTotals);
    const min = Math.min(...letterTotals);
    // Pinkies have few letters, so allow slack, but no finger should be starved.
    expect(min).toBeGreaterThan(max * 0.45);
  });

  it('targeted drills lean on the requested fingers', () => {
    const targets: FingerId[] = ['L5', 'R5'];
    const targeted = generateFingerDrill({ mode: 'targeted', wordCount: 200, targetFingers: targets, random: seeded(3) });
    const share = (words: string[]) => {
      let hit = 0;
      let total = 0;
      for (const w of words) {
        for (const ch of w) {
          total++;
          if (targets.includes(getFingerForChar(ch)!)) hit++;
        }
      }
      return hit / total;
    };
    // Natural share of pinky letters in ordinary English words
    const baseline = share(getWordPool().map((w) => w.word));
    expect(targeted).toHaveLength(200);
    expect(share(targeted)).toBeGreaterThan(baseline * 1.8);
  });
});
