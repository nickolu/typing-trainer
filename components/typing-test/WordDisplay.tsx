import { WordState } from '@/lib/types';
import { compareWords } from '@/lib/test-engine/calculations';
import { cn } from '@/lib/utils';

interface WordDisplayProps {
  word: string;
  typed: string;
  state: WordState;
}

export function WordDisplay({ word, typed, state }: WordDisplayProps) {
  // Handle completed words
  if (state === 'completed-correct') {
    return (
      <span className="test-word-correct inline-block px-1">
        {word}
      </span>
    );
  }

  if (state === 'completed-incorrect') {
    return (
      <span className="test-word-incorrect inline-block px-1">
        {word}
      </span>
    );
  }

  // Handle pending words
  if (state === 'pending') {
    return (
      <span className="test-word-pending inline-block px-1">
        {word}
      </span>
    );
  }

  // Handle current word - show character-by-character comparison
  if (state === 'current') {
    const comparison = compareWords(word, typed);

    return (
      <span className="test-word-current inline-block px-1 relative">
        {comparison.map((charComp, index) => {
          const className = cn(
            'relative inline-block',
            charComp.status === 'correct' && 'test-char-correct',
            charComp.status === 'incorrect' && 'test-char-incorrect',
            charComp.status === 'pending' && 'test-char-pending'
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
