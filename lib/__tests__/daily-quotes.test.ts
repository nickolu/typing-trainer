import { describe, it, expect } from 'vitest';
import { getDailyQuote, quoteToText, quotePool } from '../daily-quotes';

describe('quotePool', () => {
  it('contains at least 120 quotes', () => {
    expect(quotePool.length).toBeGreaterThanOrEqual(120);
  });

  it('all quotes have text and author fields', () => {
    for (const quote of quotePool) {
      expect(typeof quote.text).toBe('string');
      expect(quote.text.trim().length).toBeGreaterThan(0);
      expect(typeof quote.author).toBe('string');
      expect(quote.author.trim().length).toBeGreaterThan(0);
    }
  });

  it('all quotes are between 3 and 200 words', () => {
    for (const quote of quotePool) {
      const wordCount = quote.text.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(3);
      expect(wordCount).toBeLessThanOrEqual(200);
    }
  });
});

describe('getDailyQuote', () => {
  it('returns a valid DailyQuote', () => {
    const q = getDailyQuote('2024-06-01');
    expect(q).toHaveProperty('text');
    expect(q).toHaveProperty('author');
    expect(typeof q.text).toBe('string');
    expect(typeof q.author).toBe('string');
  });

  it('is deterministic: same date always returns same quote', () => {
    const q1 = getDailyQuote('2024-06-01');
    const q2 = getDailyQuote('2024-06-01');
    expect(q1.text).toBe(q2.text);
    expect(q1.author).toBe(q2.author);
  });

  it('returns different quotes for different dates', () => {
    const quotes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const date = new Date(Date.UTC(2024, 0, 1 + i));
      const dateStr = date.toISOString().slice(0, 10);
      const q = getDailyQuote(dateStr);
      quotes.add(q.text);
    }
    // With 120+ quotes over 10 days we expect at least some variety
    expect(quotes.size).toBeGreaterThan(1);
  });

  it('returns a quote from the pool', () => {
    const q = getDailyQuote('2024-06-01');
    const found = quotePool.find(p => p.text === q.text && p.author === q.author);
    expect(found).toBeDefined();
  });
});

describe('quoteToText', () => {
  it('formats quote with attribution dash', () => {
    const text = quoteToText({ text: 'Hello world.', author: 'Test Author' });
    expect(text).toBe('Hello world. — Test Author');
  });
});
