import { useEffect, useRef } from 'react';
import { WordDisplay } from './WordDisplay';
import { WordState } from '@/lib/types';

interface TestDisplayProps {
  targetWords: string[];
  completedWords: string[];
  currentInput: string;
  currentWordIndex: number;
}

export function TestDisplay({
  targetWords,
  completedWords,
  currentInput,
  currentWordIndex,
}: TestDisplayProps) {
  const currentWordRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep current word in view
  useEffect(() => {
    if (currentWordRef.current) {
      currentWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentWordIndex]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="font-mono text-2xl leading-relaxed flex flex-wrap gap-2">
        {targetWords.map((word, index) => {
          let state: WordState;
          let typed = '';

          if (index < currentWordIndex) {
            // Completed word
            typed = completedWords[index] || '';
            state =
              typed === word ? 'completed-correct' : 'completed-incorrect';
          } else if (index === currentWordIndex) {
            // Current word being typed
            state = 'current';
            typed = currentInput;
          } else {
            // Pending word
            state = 'pending';
          }

          const isCurrent = index === currentWordIndex;

          return (
            <div
              key={index}
              ref={isCurrent ? currentWordRef : null}
            >
              <WordDisplay
                word={word}
                typed={typed}
                state={state}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
