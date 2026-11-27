import { describe, it, expect } from 'vitest';
import { formatNumber } from '@/lib/utils';

describe('formatNumber', () => {
  it('caps at two decimals by default and drops trailing zeros', () => {
    expect(formatNumber(97.33333)).toBe('97.33');
    expect(formatNumber(97.5)).toBe('97.5');
    expect(formatNumber(60)).toBe('60');
    expect(formatNumber(187.39999999997)).toBe('187.4');
  });

  it('honours a custom precision', () => {
    expect(formatNumber(97.36, 1)).toBe('97.4');
    expect(formatNumber(97.36, 0)).toBe('97');
  });

  it('renders non-finite values as a dash', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
  });
});
