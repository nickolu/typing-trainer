'use client';

import { useMemo } from 'react';
import { TestResult } from '@/lib/types';
import { getProblematicWords, ProblematicWord } from '@/lib/db/firebase';
import { AlertTriangle } from 'lucide-react';

interface ProblematicWordsProps {
  results: TestResult[];
}

export function ProblematicWords({ results }: ProblematicWordsProps) {
  const problematicWords = useMemo(() => {
    return getProblematicWords(results);
  }, [results]);

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <h2 className="text-lg font-bold">Problematic Words</h2>
      </div>

      {problematicWords.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-editor-muted text-sm">
            Words you type incorrectly more than once will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {problematicWords.map(({ word, count }) => (
            <div
              key={word}
              className="flex items-center justify-between p-2 bg-editor-muted/20 rounded hover:bg-editor-muted/30 transition-colors"
            >
              <span className="font-mono text-sm">{word}</span>
              <div className="flex items-center gap-2">
                <span className="text-editor-muted text-xs">mistyped</span>
                <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold text-xs">
                  {count}x
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
