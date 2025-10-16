import { useEffect, useRef, useMemo } from 'react';
import { WordDisplay } from './WordDisplay';
import { TypingCursor } from './TypingCursor';
import { WordState } from '@/lib/types';

interface TestDisplayProps {
  targetWords: string[];
  completedWords: string[];
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

  // Calculate which character indices should be highlighted for each word
  // and which inter-word spaces should be highlighted
  const highlightData = useMemo(() => {
    if (!showHighlights || practiceSequences.length === 0) {
      return {
        wordHighlights: new Map<number, Set<number>>(),
        spaceHighlights: new Set<number>(),
      };
    }

    // Build the full text with spaces
    const fullText = targetWords.join(' ');
    const wordHighlights = new Map<number, Set<number>>();
    const spaceHighlights = new Set<number>(); // Track which word indices have highlighted space after them

    // Find all occurrences of practice sequences in the full text
    for (const sequence of practiceSequences) {
      let searchIndex = 0;
      while (searchIndex < fullText.length) {
        const foundIndex = fullText.indexOf(sequence, searchIndex);
        if (foundIndex === -1) break;

        // Map the character positions back to word indices
        let currentWordIdx = 0;
        let charInWord = 0;

        for (let i = 0; i <= foundIndex + sequence.length - 1; i++) {
          if (i === fullText.length) break;

          if (fullText[i] === ' ') {
            // Check if this space is part of the highlighted sequence
            if (i >= foundIndex && i < foundIndex + sequence.length) {
              spaceHighlights.add(currentWordIdx);
            }
            currentWordIdx++;
            charInWord = 0;
          } else {
            if (i >= foundIndex && i < foundIndex + sequence.length) {
              // This character should be highlighted
              if (!wordHighlights.has(currentWordIdx)) {
                wordHighlights.set(currentWordIdx, new Set());
              }
              wordHighlights.get(currentWordIdx)!.add(charInWord);
            }
            charInWord++;
          }
        }

        searchIndex = foundIndex + 1;
      }
    }

    return { wordHighlights, spaceHighlights };
  }, [targetWords, practiceSequences, showHighlights]);

  // Auto-scroll to keep current word in view
  useEffect(() => {
    if (currentWordRef.current && textContainerRef.current) {
      const wordElement = currentWordRef.current;
      const container = textContainerRef.current.parentElement;

      if (container) {
        const containerRect = container.getBoundingClientRect();
        const wordRect = wordElement.getBoundingClientRect();

        // Only scroll if the word is near the bottom of the visible area
        // This prevents unnecessary scrolling on every keystroke
        const bottomThreshold = containerRect.bottom - 60; // 60px from bottom

        if (wordRect.bottom > bottomThreshold) {
          wordElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    }
  }, [currentWordIndex]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div ref={textContainerRef} className="font-mono text-2xl leading-relaxed flex flex-wrap relative">
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

          const hasHighlightedSpace = highlightData.spaceHighlights.has(index);
          const isLastWord = index === targetWords.length - 1;

          return (
            <div
              key={index}
              ref={isCurrent ? currentWordRef : null}
              data-word-index={index}
              className="inline-flex items-center"
            >
              <WordDisplay
                word={word}
                typed={typed}
                state={state}
                highlightIndices={highlightData.wordHighlights.get(index) || new Set()}
              />
              {/* Show highlighted space or regular space separator */}
              {!isLastWord && (
                hasHighlightedSpace ? (
                  <span className="inline-block bg-purple-500/20 rounded" style={{ width: '0.6em', height: '1.3em' }}>
                    &nbsp;
                  </span>
                ) : (
                  <span className="inline-block mr-1" style={{ width: '0.5em' }}>
                    &nbsp;
                  </span>
                )
              )}
            </div>
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
