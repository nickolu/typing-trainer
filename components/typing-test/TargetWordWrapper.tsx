import { CompletedWord, WordState } from "@/lib/types";

interface TargetWordWrapperProps {
  index: number;
  currentWordIndex: number;
  completedWords: CompletedWord[];
  currentInput: string;
  targetWords: string[];
  currentWordRef: React.RefObject<HTMLDivElement>;
  highlightData: { wordHighlights: Map<number, Set<number>>; spaceHighlights: Set<number> };
  children: (word: string, typed: string, state: WordState, wasSkipped: boolean) => JSX.Element;
}

export const TargetWordWrapper = ({
  index,
  currentWordIndex,
  completedWords,
  currentInput,
  targetWords,
  currentWordRef,
  highlightData,
  children,
}: TargetWordWrapperProps) => {
  let state: WordState;
  let typed = "";
  let wasSkipped = false;

  if (index < currentWordIndex) {
    // Completed word
    const completedWord = completedWords[index];
    typed = completedWord?.text || "";
    wasSkipped = completedWord?.wasSkipped || false;
    state = typed === targetWords[index] ? "completed-correct" : "completed-incorrect";
  } else if (index === currentWordIndex) {
    // Current word being typed
    state = "current";
    typed = currentInput;
  } else {
    // Pending word
    state = "pending";
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
      {children(targetWords[index], typed, state, wasSkipped)}
      {/* Show highlighted space or regular space separator */}
      {!isLastWord &&
        (hasHighlightedSpace ? (
          <span
            className="inline-block bg-purple-500/20 rounded"
            style={{ width: "0.6em", height: "1.3em" }}
          >
            &nbsp;
          </span>
        ) : (
          <span className="inline-block mr-1" style={{ width: "0.5em" }}>
            &nbsp;
          </span>
        ))}
    </div>
  );
};
