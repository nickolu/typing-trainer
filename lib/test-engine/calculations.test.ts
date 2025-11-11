import { describe, it, expect } from 'vitest';
import { calculateWPM, calculateAccuracy } from './calculations';

describe('calculations', () => {
  describe('calculateWPM', () => {
    it('should calculate WPM correctly for completed words', () => {
      const targetWords = Array(50).fill('test');
      const typedWords = Array(50).fill('test');
      const durationSeconds = 60; // 1 minute
      const wpm = calculateWPM(targetWords, typedWords, durationSeconds);
      expect(wpm).toBeGreaterThan(0);
      expect(Number.isInteger(wpm)).toBe(true);
    });

    it('should handle zero duration', () => {
      const targetWords = ['test'];
      const typedWords = ['test'];
      const wpm = calculateWPM(targetWords, typedWords, 0);
      expect(wpm).toBe(0);
    });

    it('should handle no words typed', () => {
      const targetWords = ['test'];
      const typedWords = [];
      const wpm = calculateWPM(targetWords, typedWords, 60);
      expect(wpm).toBe(0);
    });

    it('should return a whole number', () => {
      const targetWords = ['hello', 'world'];
      const typedWords = ['hello', 'world'];
      const wpm = calculateWPM(targetWords, typedWords, 60);
      expect(Number.isInteger(wpm)).toBe(true);
    });
  });

  describe('calculateAccuracy', () => {
    it('should calculate 100% accuracy for perfect typing', () => {
      const targetWords = ['hello', 'world', 'test'];
      const typedWords = ['hello', 'world', 'test'];
      const result = calculateAccuracy(targetWords, typedWords);
      expect(result.accuracy).toBe(100);
      expect(result.correctCount).toBe(3);
      expect(result.incorrectCount).toBe(0);
    });

    it('should calculate 0% accuracy for all wrong words', () => {
      const targetWords = ['hello', 'world', 'test'];
      const typedWords = ['wrong', 'wrong', 'wrong'];
      const result = calculateAccuracy(targetWords, typedWords);
      expect(result.accuracy).toBe(0);
      expect(result.incorrectCount).toBe(3);
    });

    it('should calculate partial accuracy', () => {
      const targetWords = ['hello', 'world', 'test', 'typing'];
      const typedWords = ['hello', 'world', 'wrong', 'wrong'];
      const result = calculateAccuracy(targetWords, typedWords);
      expect(result.accuracy).toBe(50); // 2 correct out of 4 = 50%
      expect(result.correctCount).toBe(2);
      expect(result.incorrectCount).toBe(2);
    });

    it('should handle empty arrays', () => {
      const result = calculateAccuracy([], []);
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(100);
    });

    it('should return proper structure', () => {
      const targetWords = ['hello'];
      const typedWords = ['hello'];
      const result = calculateAccuracy(targetWords, typedWords);
      expect(result).toHaveProperty('accuracy');
      expect(result).toHaveProperty('perCharacterAccuracy');
      expect(result).toHaveProperty('correctCount');
      expect(result).toHaveProperty('incorrectCount');
      expect(result).toHaveProperty('totalTyped');
    });
  });
});

