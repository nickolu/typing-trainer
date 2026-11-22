import { describe, it, expect } from 'vitest';
import { KeystrokeEvent } from '@/lib/types';
import {
  wordsWithErrors,
  normalizeWord,
  mergeWordErrors,
  evictWordErrors,
  rankWordErrors,
} from './word-errors';

let t = 0;
const ks = (
  wordIndex: number,
  key: string,
  wasCorrect: boolean,
  isBackspace = false
): KeystrokeEvent => ({
  timestamp: t++,
  key,
  wordIndex,
  charIndex: 0,
  wasCorrect,
  isBackspace,
});

describe('wordsWithErrors', () => {
  it('counts a corrected typo', () => {
    const events = [ks(0, 't', true), ks(0, 'x', false), ks(0, 'Backspace', false, true), ks(0, 'h', true)];
    expect(wordsWithErrors(events, ['the'])).toEqual([{ word: 'the', count: 1 }]);
  });

  it('does not count a clean word', () => {
    const events = [ks(0, 't', true), ks(0, 'h', true), ks(0, 'e', true), ks(0, ' ', true)];
    expect(wordsWithErrors(events, ['the'])).toEqual([]);
  });

  it('counts an in-word backspace after typing a char as 1', () => {
    const events = [ks(0, 'w', true), ks(0, 'Backspace', false, true)];
    expect(wordsWithErrors(events, ['word'])).toEqual([{ word: 'word', count: 1 }]);
  });

  it('ignores a boundary backspace into the previous word', () => {
    const events = [
      ks(1, 'w', true), ks(1, 'o', true), ks(1, 'r', true), ks(1, 'd', true), ks(1, ' ', true),
      ks(2, 'Backspace', false, true),
    ];
    expect(wordsWithErrors(events, ['the', 'word', 'next'])).toEqual([]);
  });

  it('counts each wrong keystroke but ignores space and Tab', () => {
    const events = [ks(0, 'a', false), ks(0, 'b', false), ks(0, ' ', false), ks(0, 'Tab', false)];
    expect(wordsWithErrors(events, ['word'])).toEqual([{ word: 'word', count: 2 }]);
  });

  it('normalizes and merges words', () => {
    const events = [ks(0, 'x', false), ks(1, 'x', false), ks(2, 'x', false)];
    expect(wordsWithErrors(events, ['The,', 'the', '"THE"'])).toEqual([{ word: 'the', count: 3 }]);
  });

  it('skips empty and 1-char words and unknown indices', () => {
    const events = [ks(0, 'x', false), ks(1, 'x', false), ks(2, 'x', false)];
    expect(wordsWithErrors(events, ['a', '--'])).toEqual([]);
  });
});

describe('normalizeWord', () => {
  it('lowercases and strips edge punctuation but keeps inner punctuation', () => {
    expect(normalizeWord("Don't.")).toBe("don't");
    expect(normalizeWord('(Hello!)')).toBe('hello');
    expect(normalizeWord('I')).toBe('');
  });
});

describe('mergeWordErrors', () => {
  it('adds counts and updates lastSeenAt', () => {
    const merged = mergeWordErrors({ the: { errorCount: 2, lastSeenAt: 1 } }, [{ word: 'the', count: 3 }, { word: 'new', count: 1 }], 99);
    expect(merged).toEqual({ the: { errorCount: 5, lastSeenAt: 99 }, new: { errorCount: 1, lastSeenAt: 99 } });
  });
});

describe('evictWordErrors', () => {
  it('drops lowest count first, then oldest', () => {
    const words = {
      a: { errorCount: 1, lastSeenAt: 5 },
      b: { errorCount: 1, lastSeenAt: 1 },
      c: { errorCount: 3, lastSeenAt: 0 },
      d: { errorCount: 2, lastSeenAt: 2 },
    };
    expect(Object.keys(evictWordErrors(words, 2)).sort()).toEqual(['c', 'd']);
    expect(Object.keys(evictWordErrors(words, 3)).sort()).toEqual(['a', 'c', 'd']);
  });

  it('is a no-op under the cap', () => {
    const words = { a: { errorCount: 1, lastSeenAt: 1 } };
    expect(evictWordErrors(words, 5)).toBe(words);
  });
});

describe('rankWordErrors', () => {
  it('ranks by count desc then recency desc and limits to topN', () => {
    const words = {
      a: { errorCount: 2, lastSeenAt: 1 },
      b: { errorCount: 5, lastSeenAt: 1 },
      c: { errorCount: 2, lastSeenAt: 9 },
    };
    expect(rankWordErrors(words, 2).map((r) => r.word)).toEqual(['b', 'c']);
    expect(rankWordErrors(words, 10).map((r) => r.word)).toEqual(['b', 'c', 'a']);
  });
});
