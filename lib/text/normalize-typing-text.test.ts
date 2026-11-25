import { describe, it, expect } from 'vitest';
import { normalizeTypingText as n } from './normalize-typing-text';

describe('normalizeTypingText', () => {
  it('converts single curly quotes', () => {
    expect(n('‘a’ ‚b‛ 5′')).toBe("'a' 'b' 5'");
  });
  it('converts double curly quotes and guillemets', () => {
    expect(n('“a” „b‟ 5″ «c»')).toBe('"a" "b" 5" "c"');
  });
  it('converts em dash to two hyphens', () => {
    expect(n('wait—what')).toBe('wait--what');
  });
  it('converts en dash, figure dash, horizontal bar, minus to hyphen', () => {
    expect(n('1–2 3‒4 5―6 7−8')).toBe('1-2 3-4 5-6 7-8');
  });
  it('converts ellipsis', () => {
    expect(n('hmm…')).toBe('hmm...');
  });
  it('converts unicode spaces to regular spaces', () => {
    expect(n('a b c d e　f g h')).toBe('a b c d e f g h');
  });
  it('removes zero-width characters', () => {
    expect(n('a​b‌c‍d﻿e⁠f')).toBe('abcdef');
  });
  it('converts symbols', () => {
    expect(n('2×3 ÷ 4 • x')).toBe('2x3 / 4 * x');
  });
  it('strips accents', () => {
    expect(n('café naïve Ñandú Zoë')).toBe('cafe naive Nandu Zoe');
  });
  it('leaves plain ASCII unchanged', () => {
    const s = `It's a "test" -- with... punctuation: 1+2=3! (ok) [x] {y} a_b @#$%^&*`;
    expect(n(s)).toBe(s);
  });
  it('leaves other symbols untouched', () => {
    expect(n('√9 = 3')).toBe('√9 = 3');
  });
});
