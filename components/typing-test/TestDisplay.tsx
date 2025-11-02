import { useEffect, useRef, useMemo } from 'react';
import { WordDisplay } from './WordDisplay';
import { TypingCursor } from './TypingCursor';
import { WordState, CompletedWord } from '@/lib/types';
import { useHighlightedData } from './useHighlightedData';
import { TargetWordWrapper } from './TargetWordWrapper';

interface TestDisplayProps {
  targetWords: string[];
  completedWords: CompletedWord[];
  currentInput: string;
  currentWordIndex: number;
  practiceSequences?: string[];
  showHighlights?: boolean;
}

export function TestDisplay({
  targetWords,
  completedWords,
  currentInput,
  currentWordIndex,
  practiceSequences = [],
  showHighlights = true,
}: TestDisplayProps) {
  const currentWordRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);


  const highlightData = useHighlightedData(targetWords, practiceSequences, showHighlights);

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
      <div ref={textContainerRef} className="font-mono text-2xl leading-relaxed flex flex-wrap relative">
        {targetWords.map((word, index) => {
          return (
            <TargetWordWrapper
              key={index}
              index={index}
              currentWordIndex={currentWordIndex}
              completedWords={completedWords}
              currentInput={currentInput}
              targetWords={targetWords}
              currentWordRef={currentWordRef}
              highlightData={highlightData}
            >
              {(word: string, typed: string, state: WordState, wasSkipped: boolean) => {
                return (
                  <WordDisplay
                    word={word}
                    typed={typed}
                    state={state}
                    wasSkipped={wasSkipped}
                    highlightIndices={highlightData.wordHighlights.get(index) || new Set()}
                  />
                );
              }}
            </TargetWordWrapper>
          );
        })}

        {/* Smooth animated cursor */}
        <TypingCursor
          containerRef={textContainerRef}
          currentWordIndex={currentWordIndex}
          currentCharIndex={currentInput.length}
          isActive={true}
        />
      </div>
    </div>
  );
}
