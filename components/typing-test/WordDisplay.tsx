import { WordState } from '@/lib/types';
import { compareWords } from '@/lib/test-engine/calculations';
import { cn } from '@/lib/utils';

interface WordDisplayProps {
  word: string;
  typed: string;
  state: WordState;
  practiceSequences?: string[];
}

/**
 * Helper function to check if a character at a given position is part of a practice sequence
 */
function isPracticeSequence(word: string, charIndex: number, sequences: string[]): boolean {
  if (sequences.length === 0) return false;

  for (const seq of sequences) {
    // Check all possible positions where this sequence could start
    for (let startPos = Math.max(0, charIndex - seq.length + 1); startPos <= charIndex; startPos++) {
      const endPos = startPos + seq.length;
      if (endPos <= word.length) {
        const substring = word.substring(startPos, endPos);
        // Check if this substring matches the sequence and includes our character
        if (substring === seq && charIndex >= startPos && charIndex < endPos) {
          return true;
        }
      }
    }
  }

  return false;
}

export function WordDisplay({ word, typed, state, practiceSequences = [] }: WordDisplayProps) {
  // Handle completed words
  if (state === 'completed-correct') {
    return (
      <span className="test-word-correct inline-block px-1">
        {word.split('').map((char, index) => {
          const isTargeted = isPracticeSequence(word, index, practiceSequences);
          return (
            <span
              key={index}
              className={isTargeted ? 'bg-purple-500/20 rounded px-0.5' : ''}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  }

  if (state === 'completed-incorrect') {
    return (
      <span className="test-word-incorrect inline-block px-1">
        {word.split('').map((char, index) => {
          const isTargeted = isPracticeSequence(word, index, practiceSequences);
          return (
            <span
              key={index}
              className={isTargeted ? 'bg-purple-500/20 rounded px-0.5' : ''}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  }

  // Handle pending words
  if (state === 'pending') {
    return (
      <span className="test-word-pending inline-block px-1">
        {word.split('').map((char, index) => {
          const isTargeted = isPracticeSequence(word, index, practiceSequences);
          return (
            <span
              key={index}
              className={isTargeted ? 'bg-purple-500/20 rounded px-0.5' : ''}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  }

  // Handle current word - show character-by-character comparison
  if (state === 'current') {
    const comparison = compareWords(word, typed);

    return (
      <span className="test-word-current inline-block px-1 relative">
        {comparison.map((charComp, index) => {
          const isTargeted = isPracticeSequence(word, index, practiceSequences);

          const className = cn(
            'relative inline-block',
            charComp.status === 'correct' && 'test-char-correct',
            charComp.status === 'incorrect' && 'test-char-incorrect',
            charComp.status === 'pending' && 'test-char-pending',
            isTargeted && 'bg-purple-500/20 rounded px-0.5'
          );

          // Show cursor before this character if it's the first untyped character
          const showCursorBefore = index === typed.length;

          return (
            <span key={index} className={className}>
              {showCursorBefore && (
                <span className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-editor-accent animate-pulse cursor-slide" />
              )}
              {charComp.char}
            </span>
          );
        })}
      </span>
    );
  }

  return null;
}
