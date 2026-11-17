import { describe, it, expect } from 'vitest';
import { textToWords, getRandomTest } from '../test-content';

describe('textToWords', () => {
  it('returns an empty array for empty text instead of looping forever', () => {
    expect(textToWords('', 60)).toEqual([]);
    expect(textToWords('   \n ', 60)).toEqual([]);
  });

  it('repeats text to reach minWords', () => {
    expect(textToWords('a b', 5)).toEqual(['a', 'b', 'a', 'b', 'a']);
  });
});

describe('getRandomTest', () => {
  it('falls back to any static test for a category with no tests', () => {
    // AI styles (e.g. "ai-prose") are not static categories
    const test = getRandomTest('ai-prose' as Parameters<typeof getRandomTest>[0]);
    expect(test).toBeDefined();
    expect(test.text.length).toBeGreaterThan(0);
  });
});
