import { describe, it, expect } from 'vitest';
import { getLastWeekRange } from '../db/weekly-winner';

describe('getLastWeekRange', () => {
  it('returns correct range for a Wednesday', () => {
    // Wed June 11, 2025 → last week is Mon June 2 - Sun June 8
    const result = getLastWeekRange('2025-06-11');
    expect(result.weekStart).toBe('2025-06-02');
    expect(result.weekEnd).toBe('2025-06-08');
  });

  it('returns correct range for a Monday', () => {
    // Mon June 9, 2025 → last week is Mon June 2 - Sun June 8
    const result = getLastWeekRange('2025-06-09');
    expect(result.weekStart).toBe('2025-06-02');
    expect(result.weekEnd).toBe('2025-06-08');
  });

  it('returns correct range for a Sunday', () => {
    // Sun June 8, 2025 → last week is Mon May 26 - Sun June 1
    const result = getLastWeekRange('2025-06-08');
    expect(result.weekStart).toBe('2025-05-26');
    expect(result.weekEnd).toBe('2025-06-01');
  });

  it('handles year boundaries', () => {
    // Wed Jan 1, 2025 → last week is Mon Dec 23 - Sun Dec 29, 2024
    const result = getLastWeekRange('2025-01-01');
    expect(result.weekStart).toBe('2024-12-23');
    expect(result.weekEnd).toBe('2024-12-29');
  });

  it('returns correct range for a Tuesday', () => {
    // Tue June 10, 2025 → last week is Mon June 2 - Sun June 8
    const result = getLastWeekRange('2025-06-10');
    expect(result.weekStart).toBe('2025-06-02');
    expect(result.weekEnd).toBe('2025-06-08');
  });

  it('returns correct range for a Saturday', () => {
    // Sat June 7, 2025 → last week is Mon May 26 - Sun June 1
    const result = getLastWeekRange('2025-06-07');
    expect(result.weekStart).toBe('2025-05-26');
    expect(result.weekEnd).toBe('2025-06-01');
  });
});
