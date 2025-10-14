import { WordState } from '@/lib/types';
import { compareWords } from '@/lib/test-engine/calculations';
import { cn } from '@/lib/utils';

interface WordDisplayProps {
  word: string;
  typed: string;
  state: WordState;
  highlightIndices?: Set<number>;
}

export function WordDisplay({ word, typed, state, highlightIndices = new Set() }: WordDisplayProps) {
  // Helper to render a character with potential highlighting
  const renderChar = (char: string, index: number, isTargeted: boolean) => {
    // Special handling for spaces when highlighted
    if (char === ' ' && isTargeted) {
      return (
        <span
          key={index}
          className="inline-block bg-purple-500/30 border border-purple-500/50 rounded px-1 mx-0.5"
          style={{ minWidth: '0.5rem' }}
        >
          {' '}
        </span>
      );
    }

    // Regular character rendering
    return (
      <span
        key={index}
        className={isTargeted ? 'bg-purple-500/20 rounded' : ''}
      >
        {char}
      </span>
    );
  };

  // Handle completed words
  if (state === 'completed-correct') {
    return (
      <span className="test-word-correct inline-block">
        {word.split('').map((char, index) => {
          const isTargeted = highlightIndices.has(index);
          return renderChar(char, index, isTargeted);
        })}
      </span>
    );
  }

  if (state === 'completed-incorrect') {
    return (
      <span className="test-word-incorrect inline-block">
        {word.split('').map((char, index) => {
          const isTargeted = highlightIndices.has(index);
          return renderChar(char, index, isTargeted);
        })}
      </span>
    );
  }

  // Handle pending words
  if (state === 'pending') {
    return (
      <span className="test-word-pending inline-block">
        {word.split('').map((char, index) => {
          const isTargeted = highlightIndices.has(index);
          return renderChar(char, index, isTargeted);
        })}
      </span>
    );
  }

  // Handle current word - show character-by-character comparison
  if (state === 'current') {
    const comparison = compareWords(word, typed);

    return (
      <span className="test-word-current inline-block relative">
        {comparison.map((charComp, index) => {
          const isTargeted = highlightIndices.has(index);
          const isSpace = charComp.char === ' ';

          // Special styling for highlighted spaces
          const baseClassName = cn(
            'relative inline-block',
            charComp.status === 'correct' && 'test-char-correct',
            charComp.status === 'incorrect' && 'test-char-incorrect',
            charComp.status === 'pending' && 'test-char-pending'
          );

          // Apply different highlight style for spaces
          const className = isTargeted
            ? isSpace
              ? cn(baseClassName, 'bg-purple-500/30 border border-purple-500/50 rounded px-1 mx-0.5')
              : cn(baseClassName, 'bg-purple-500/20 rounded')
            : baseClassName;

          // Show cursor before this character if it's the first untyped character
          const showCursorBefore = index === typed.length;

          return (
            <span
              key={index}
              className={className}
              style={isTargeted && isSpace ? { minWidth: '0.5rem' } : undefined}
            >
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
