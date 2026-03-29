'use client';

import { useMemo } from 'react';
import { MapPin } from 'lucide-react';

interface ErrorHighlightProps {
  targetWords: string[];
  typedWords: string[];
}

interface CharInfo {
  char: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
}

interface WordInfo {
  chars: CharInfo[];
  wordIndex: number;
}

export function ErrorHighlight({ targetWords, typedWords }: ErrorHighlightProps) {
  const wordInfos = useMemo<WordInfo[]>(() => {
    const count = Math.max(targetWords.length, typedWords.length);
    const result: WordInfo[] = [];

    for (let i = 0; i < count; i++) {
      const target = targetWords[i] ?? '';
      const typed = typedWords[i] ?? '';
      const chars: CharInfo[] = [];

      const maxLen = Math.max(target.length, typed.length);

      for (let j = 0; j < maxLen; j++) {
        const targetChar = target[j];
        const typedChar = typed[j];

        if (targetChar === undefined) {
          // Extra characters typed beyond the target word length
          chars.push({ char: typedChar, status: 'extra' });
        } else if (typedChar === undefined) {
          // Target characters that were never typed (missing)
          chars.push({ char: targetChar, status: 'missing' });
        } else if (typedChar === targetChar) {
          chars.push({ char: targetChar, status: 'correct' });
        } else {
          // Typed the wrong character — show target char highlighted as error
          chars.push({ char: targetChar, status: 'incorrect' });
        }
      }

      result.push({ chars, wordIndex: i });
    }

    return result;
  }, [targetWords, typedWords]);

  const hasErrors = useMemo(
    () => wordInfos.some((w) => w.chars.some((c) => c.status !== 'correct')),
    [wordInfos]
  );

  if (targetWords.length === 0 || typedWords.length === 0) {
    return null;
  }

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-editor-error" />
        Error Map
      </h2>

      {!hasErrors ? (
        <p className="text-editor-muted text-center py-4">
          Perfect accuracy — no character errors found.
        </p>
      ) : (
        <>
          <p className="text-sm text-editor-muted mb-4">
            Target text with character-level error highlighting.{' '}
            <span className="text-editor-error">Red</span> = mistyped,{' '}
            <span className="text-editor-muted underline decoration-editor-error">underlined</span> = missing,{' '}
            <span className="text-editor-fg">normal</span> = correct.
          </p>

          <div className="overflow-x-auto">
            <div className="font-mono text-base leading-loose min-w-0 flex flex-wrap gap-x-2 gap-y-1">
              {wordInfos.map((word, wi) => {
                const wordHasError = word.chars.some((c) => c.status !== 'correct');
                return (
                  <span
                    key={wi}
                    className={`inline-block whitespace-nowrap ${
                      wordHasError ? 'rounded px-0.5 bg-editor-error/5' : ''
                    }`}
                  >
                    {word.chars.map((ch, ci) => {
                      if (ch.status === 'correct') {
                        return (
                          <span key={ci} className="text-editor-fg">
                            {ch.char}
                          </span>
                        );
                      }
                      if (ch.status === 'incorrect') {
                        return (
                          <span
                            key={ci}
                            className="text-editor-error bg-editor-error/20 rounded-sm"
                          >
                            {ch.char}
                          </span>
                        );
                      }
                      if (ch.status === 'missing') {
                        return (
                          <span
                            key={ci}
                            className="text-editor-muted underline decoration-editor-error decoration-wavy"
                          >
                            {ch.char}
                          </span>
                        );
                      }
                      // extra chars (typed beyond target length) — show as error
                      return (
                        <span
                          key={ci}
                          className="text-editor-error bg-editor-error/20 rounded-sm"
                        >
                          {ch.char}
                        </span>
                      );
                    })}
                  </span>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
