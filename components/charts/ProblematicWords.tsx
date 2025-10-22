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
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h2 className="text-xl font-bold">Problematic Words</h2>
      </div>

      {problematicWords.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-editor-muted">
            Words you type incorrectly more than once will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {problematicWords.map(({ word, count }) => (
            <div
              key={word}
              className="flex items-center justify-between p-3 bg-editor-muted/20 rounded-lg hover:bg-editor-muted/30 transition-colors"
            >
              <span className="font-mono text-lg">{word}</span>
              <div className="flex items-center gap-2">
                <span className="text-editor-muted text-sm">mistyped</span>
                <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full font-semibold">
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
