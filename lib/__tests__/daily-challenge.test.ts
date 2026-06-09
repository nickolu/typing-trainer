import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDailySeed,
  getTodayPST,
  getDailySelectableTests,
  getDailyPassage,
} from '../daily-challenge';

describe('getDailySeed', () => {
  it('is deterministic: same date produces same seed', () => {
    const seed1 = getDailySeed('2024-06-01');
    const seed2 = getDailySeed('2024-06-01');
    expect(seed1).toBe(seed2);
  });

  it('produces different seeds for different dates', () => {
    const seed1 = getDailySeed('2024-06-01');
    const seed2 = getDailySeed('2024-06-02');
    expect(seed1).not.toBe(seed2);
  });

  it('returns an unsigned 32-bit integer', () => {
    const seed = getDailySeed('2024-01-01');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(seed)).toBe(true);
  });
});

describe('getTodayPST', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const today = getTodayPST();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDailySelectableTests', () => {
  it('returns no time-trial tests', () => {
    const tests = getDailySelectableTests();
    const hasTimeTrial = tests.some(t => t.category === 'time-trial');
    expect(hasTimeTrial).toBe(false);
  });

  it('returns 85 entries (all static tests excluding time-trials)', () => {
    const tests = getDailySelectableTests();
    expect(tests.length).toBe(85);
  });

  it('returns only TestContent objects with required fields', () => {
    const tests = getDailySelectableTests();
    for (const test of tests) {
      expect(test).toHaveProperty('id');
      expect(test).toHaveProperty('category');
      expect(test).toHaveProperty('title');
      expect(test).toHaveProperty('text');
    }
  });
});

describe('getDailyPassage', () => {
  beforeEach(() => {
    // Clear localStorage before each test (happy-dom provides localStorage)
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('returns a valid TestContent', () => {
    const passage = getDailyPassage('2024-06-01');
    expect(passage).toHaveProperty('id');
    expect(passage).toHaveProperty('category');
    expect(passage).toHaveProperty('title');
    expect(passage).toHaveProperty('text');
    expect(passage.category).not.toBe('time-trial');
  });

  it('is deterministic: same date always returns same passage', () => {
    const passage1 = getDailyPassage('2024-06-01');
    // Clear cache to force recomputation
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    const passage2 = getDailyPassage('2024-06-01');
    expect(passage1.id).toBe(passage2.id);
  });

  it('returns different passages for different dates', () => {
    const passages = new Set<string>();
    // Test 7 consecutive days — expect at least some variety
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.UTC(2024, 0, 1 + i));
      const dateStr = date.toISOString().slice(0, 10);
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      const passage = getDailyPassage(dateStr);
      passages.add(passage.id);
    }
    // With 85 tests and 7 days, we expect at least 2 different passages
    expect(passages.size).toBeGreaterThan(1);
  });

  it('has no repeats within a 85-day cycle', () => {
    const seen = new Set<string>();
    const tests = getDailySelectableTests();
    const cycleLength = tests.length; // 85

    for (let i = 0; i < cycleLength; i++) {
      const date = new Date(Date.UTC(2024, 0, 1 + i));
      const dateStr = date.toISOString().slice(0, 10);
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      const passage = getDailyPassage(dateStr);
      expect(seen.has(passage.id)).toBe(false);
      seen.add(passage.id);
    }
    expect(seen.size).toBe(cycleLength);
  });

  it('50 consecutive days produce no repeated passages', () => {
    const seen = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const date = new Date(Date.UTC(2024, 0, 1 + i));
      const dateStr = date.toISOString().slice(0, 10);
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      const passage = getDailyPassage(dateStr);
      expect(seen.has(passage.id)).toBe(false);
      seen.add(passage.id);
    }
  });

  it('uses localStorage cache: returns same result on second call without recomputing', () => {
    const passage1 = getDailyPassage('2024-06-01');
    // Second call uses cache
    const passage2 = getDailyPassage('2024-06-01');
    expect(passage1.id).toBe(passage2.id);
  });

  it('all tests in the selectable pool appear within one full cycle', () => {
    const tests = getDailySelectableTests();
    const seen = new Set<string>();

    for (let i = 0; i < tests.length; i++) {
      const date = new Date(Date.UTC(2024, 0, 1 + i));
      const dateStr = date.toISOString().slice(0, 10);
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      const passage = getDailyPassage(dateStr);
      seen.add(passage.id);
    }

    // Every selectable test should appear exactly once
    expect(seen.size).toBe(tests.length);
    for (const test of tests) {
      expect(seen.has(test.id)).toBe(true);
    }
  });
});
