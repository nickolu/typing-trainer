import { describe, it, expect } from 'vitest';
import { isYesterday } from '../db/daily-streaks';

describe('isYesterday', () => {
  it('returns true for consecutive days', () => {
    expect(isYesterday('2024-06-01', '2024-06-02')).toBe(true);
  });
  it('returns false for same day', () => {
    expect(isYesterday('2024-06-01', '2024-06-01')).toBe(false);
  });
  it('returns false for gap days', () => {
    expect(isYesterday('2024-06-01', '2024-06-03')).toBe(false);
  });
  it('handles month boundaries', () => {
    expect(isYesterday('2024-01-31', '2024-02-01')).toBe(true);
  });
  it('handles year boundaries', () => {
    expect(isYesterday('2023-12-31', '2024-01-01')).toBe(true);
  });
  it('returns false for reversed dates', () => {
    expect(isYesterday('2024-06-02', '2024-06-01')).toBe(false);
  });
});
