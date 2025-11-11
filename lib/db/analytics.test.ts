import { describe, it, expect } from 'vitest';
import { getProblematicWords } from './analytics';
import type { TestResult } from '@/lib/types';

describe('analytics', () => {
  describe('getProblematicWords', () => {
    it('should return empty array for empty results', () => {
      const result = getProblematicWords([]);
      expect(result).toEqual([]);
    });

    it('should identify mistyped words', () => {
      const results: Partial<TestResult>[] = [
        {
          targetWords: ['hello', 'world', 'test'],
          typedWords: ['hello', 'wrold', 'test'],
        },
      ];
      const problematic = getProblematicWords(results as TestResult[]);
      expect(problematic).toHaveLength(1);
      expect(problematic[0].word).toBe('world');
      expect(problematic[0].count).toBe(1);
    });

    it('should count multiple mistakes of same word', () => {
      const results: Partial<TestResult>[] = [
        {
          targetWords: ['test', 'word'],
          typedWords: ['tset', 'wrod'],
        },
        {
          targetWords: ['test', 'other'],
          typedWords: ['tset', 'other'],
        },
      ];
      const problematic = getProblematicWords(results as TestResult[]);
      const testWord = problematic.find(p => p.word === 'test');
      expect(testWord).toBeDefined();
      expect(testWord?.count).toBe(2);
    });

    it('should sort by frequency descending', () => {
      const results: Partial<TestResult>[] = [
        {
          targetWords: ['a', 'b', 'c'],
          typedWords: ['x', 'y', 'z'],
        },
        {
          targetWords: ['a', 'b'],
          typedWords: ['x', 'y'],
        },
      ];
      const problematic = getProblematicWords(results as TestResult[]);
      expect(problematic[0].count).toBeGreaterThanOrEqual(problematic[1]?.count || 0);
    });

    it('should handle results without target/typed words', () => {
      const results: Partial<TestResult>[] = [
        {},
        { targetWords: [] },
        { typedWords: [] },
      ];
      const problematic = getProblematicWords(results as TestResult[]);
      expect(problematic).toEqual([]);
    });

    it('should not count correctly typed words', () => {
      const results: Partial<TestResult>[] = [
        {
          targetWords: ['correct', 'wrong'],
          typedWords: ['correct', 'wrnog'],
        },
      ];
      const problematic = getProblematicWords(results as TestResult[]);
      expect(problematic).toHaveLength(1);
      expect(problematic[0].word).toBe('wrong');
    });

    it('should handle empty strings', () => {
      const results: Partial<TestResult>[] = [
        {
          targetWords: ['test', ''],
          typedWords: ['tset', ''],
        },
      ];
      const problematic = getProblematicWords(results as TestResult[]);
      // Empty strings should not be counted
      expect(problematic.every(p => p.word !== '')).toBe(true);
    });
  });
});

