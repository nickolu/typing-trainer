import { describe, it, expect } from 'vitest';
import {
  convertTimestampToDate,
  generateContentHash,
  removeUndefinedFields,
} from './shared';

describe('shared utilities', () => {
  describe('convertTimestampToDate', () => {
    it('should return a Date object when given a Date', () => {
      const date = new Date('2024-01-01');
      const result = convertTimestampToDate(date);
      expect(result).toBeInstanceOf(Date);
      expect(result).toEqual(date);
    });

    it('should convert Firestore Timestamp with toDate method', () => {
      const testDate = new Date('2024-01-01');
      const mockTimestamp = {
        toDate: () => testDate,
      };
      const result = convertTimestampToDate(mockTimestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result).toBe(testDate);
    });

    it('should convert plain object with seconds', () => {
      const timestamp = {
        seconds: 1704067200, // 2024-01-01 00:00:00 UTC
      };
      const result = convertTimestampToDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(1704067200000);
    });

    it('should convert string timestamp', () => {
      const result = convertTimestampToDate('2024-01-01T00:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should convert number timestamp (milliseconds)', () => {
      const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
      const result = convertTimestampToDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });

    it('should return current date if timestamp is null or undefined', () => {
      const resultNull = convertTimestampToDate(null);
      const resultUndefined = convertTimestampToDate(undefined);
      expect(resultNull).toBeInstanceOf(Date);
      expect(resultUndefined).toBeInstanceOf(Date);
    });
  });

  describe('generateContentHash', () => {
    it('should generate a hash from text', () => {
      const text = 'Hello, World!';
      const hash = generateContentHash(text);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate the same hash for the same text', () => {
      const text = 'Test content';
      const hash1 = generateContentHash(text);
      const hash2 = generateContentHash(text);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different text', () => {
      const hash1 = generateContentHash('Text 1');
      const hash2 = generateContentHash('Text 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = generateContentHash('');
      expect(typeof hash).toBe('string');
    });
  });

  describe('removeUndefinedFields', () => {
    it('should remove undefined fields from object', () => {
      const obj = {
        a: 1,
        b: undefined,
        c: 'test',
        d: undefined,
      };
      const result = removeUndefinedFields(obj);
      expect(result).toEqual({ a: 1, c: 'test' });
      expect('b' in result).toBe(false);
      expect('d' in result).toBe(false);
    });

    it('should handle nested objects', () => {
      const obj = {
        a: 1,
        b: {
          c: 2,
          d: undefined,
          e: 'test',
        },
      };
      const result = removeUndefinedFields(obj);
      expect(result).toEqual({
        a: 1,
        b: { c: 2, e: 'test' },
      });
    });

    it('should handle arrays', () => {
      const obj = {
        arr: [1, undefined, 3, undefined],
      };
      const result = removeUndefinedFields(obj);
      expect(result.arr).toEqual([1, null, 3, null]);
    });

    it('should preserve null values', () => {
      const obj = {
        a: null,
        b: undefined,
      };
      const result = removeUndefinedFields(obj);
      expect(result).toEqual({ a: null });
    });

    it('should preserve Date objects', () => {
      const date = new Date('2024-01-01');
      const obj = {
        a: 1,
        b: date,
      };
      const result = removeUndefinedFields(obj);
      expect(result.b).toBe(date);
    });

    it('should return null for null input', () => {
      const result = removeUndefinedFields(null);
      expect(result).toBe(null);
    });

    it('should return null for undefined input', () => {
      const result = removeUndefinedFields(undefined);
      expect(result).toBe(null);
    });
  });
});
