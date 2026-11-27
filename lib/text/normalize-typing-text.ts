// Replace characters that can't be typed on a standard keyboard with typeable equivalents.
const CHAR_MAP: Record<string, string> = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'",
  '“': '"', '”': '"', '„': '"', '‟': '"', '″': '"',
  '«': '"', '»': '"',
  '—': '--',
  '–': '-', '‒': '-', '―': '-', '−': '-',
  '…': '...',
  '×': 'x', '÷': '/', '•': '*',
};

const UNICODE_SPACES = /[  -   　]/g;
const ZERO_WIDTH = /[​-‍﻿⁠]/g;
const COMBINING_MARKS = /[̀-ͯ]/g;
const MAPPED_CHARS = new RegExp(`[${Object.keys(CHAR_MAP).join('')}]`, 'g');

export function normalizeTypingText(text: string): string {
  return text
    .replace(MAPPED_CHARS, (c) => CHAR_MAP[c])
    .replace(UNICODE_SPACES, ' ')
    .replace(ZERO_WIDTH, '')
    // Decompose accented letters, then strip the combining marks. Done after the
    // explicit mappings so NFKD can't alter them.
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '');
}

/**
 * Normalize each word with normalizeTypingText and re-split on whitespace, since a
 * mapping (e.g. an em dash to "--") can leave a word containing spaces. This is the
 * canonical word list a test is typed against; use it wherever targetWords are rebuilt
 * from stored content so comparisons line up with what the user actually saw.
 */
export function normalizeWords(words: string[]): string[] {
  return words.flatMap((w) => normalizeTypingText(w).split(/\s+/).filter(Boolean));
}
