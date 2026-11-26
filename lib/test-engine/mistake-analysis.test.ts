import { describe, it, expect } from 'vitest';
import { analyzeMistakes, getMistakeSequencesForPractice } from './mistake-analysis';
import type { KeystrokeEvent } from '../types';

const makeKeystrokes = (text: string, wrongIdx: number[]): KeystrokeEvent[] =>
  text.split('').map((key, i) => ({
    timestamp: i * 100,
    key,
    wordIndex: 0,
    charIndex: i,
    expectedChar: key,
    wasCorrect: !wrongIdx.includes(i),
    isBackspace: false,
  }));

describe('analyzeMistakes mistakeSequences', () => {
  it('never returns sequences containing whitespace or crossing word boundaries', () => {
    // mistakes on 'e' (idx 2), the space (idx 3), and 'c' (idx 4)
    const keystrokes = makeKeystrokes('the cat', [2, 3, 4]);
    const { mistakeSequences } = analyzeMistakes(keystrokes, ['the', 'cat'], ['the', 'cat']);
    const seqs = mistakeSequences.map((s) => s.sequence);

    expect(seqs.some((s) => /\s/.test(s))).toBe(false);
    expect(seqs).not.toContain('ec');
    expect(seqs).not.toContain('eca');
    expect(seqs).toEqual(expect.arrayContaining(['he', 'the']));
  });

  it('never records substitutions involving whitespace', () => {
    const keystrokes: KeystrokeEvent[] = [
      { timestamp: 0, key: 'x', wordIndex: 0, charIndex: 3, expectedChar: ' ', wasCorrect: false, isBackspace: false },
      { timestamp: 100, key: ' ', wordIndex: 1, charIndex: 0, expectedChar: 'c', wasCorrect: false, isBackspace: false },
      { timestamp: 200, key: 'v', wordIndex: 1, charIndex: 1, expectedChar: 'a', wasCorrect: false, isBackspace: false },
    ];
    const analysis = analyzeMistakes(keystrokes, ['the', 'cat'], ['the', 'cat']);
    expect(analysis.characterSubstitutions).toEqual([{ expected: 'a', actual: 'v', count: 1 }]);
    expect(getMistakeSequencesForPractice(analysis).some((t) => /\s/.test(t))).toBe(false);
  });
});
