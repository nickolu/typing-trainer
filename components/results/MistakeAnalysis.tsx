import { useMemo } from 'react';
import { TestResult } from '@/lib/types';
import { analyzeMistakes, MistakeAnalysis as MistakeAnalysisType } from '@/lib/test-engine/mistake-analysis';
import { AlertTriangle } from 'lucide-react';

interface MistakeAnalysisProps {
  result: TestResult;
}

export function MistakeAnalysis({ result }: MistakeAnalysisProps) {
  const mistakeData: MistakeAnalysisType | null = useMemo(() => {
    if (!result.keystrokeTimings || result.keystrokeTimings.length === 0) {
      return null;
    }

    return analyzeMistakes(
      result.keystrokeTimings,
      result.targetWords,
      result.typedWords
    );
  }, [result]);

  if (!mistakeData || mistakeData.totalMistakes === 0) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-green-400" />
          Mistake Analysis
        </h2>
        <p className="text-editor-muted text-center py-4">
          Excellent! No typing mistakes detected. 🎉
        </p>
      </div>
    );
  }

  const renderSequence = (seq: string) => {
    return seq.split('').map((char, idx) => {
      if (char === ' ') {
        return (
          <span key={idx} className="inline-block bg-orange-400/20 border border-orange-400/40 rounded px-1 mx-0.5">
            ␣
          </span>
        );
      }
      return <span key={idx}>{char}</span>;
    });
  };

  return (
    <div className="bg-editor-bg border border-orange-500/30 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-400" />
        Mistake Analysis
      </h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
          <div className="text-xs text-editor-muted mb-1">Total Mistakes</div>
          <div className="text-2xl font-bold text-orange-400">{mistakeData.totalMistakes}</div>
        </div>
        <div className="bg-editor-bg/50 border border-editor-muted/30 rounded-lg p-3">
          <div className="text-xs text-editor-muted mb-1">Corrections</div>
          <div className="text-2xl font-bold">{mistakeData.totalCorrections}</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
          <div className="text-xs text-editor-muted mb-1">Mistake Rate</div>
          <div className="text-2xl font-bold text-orange-400">{mistakeData.mistakeRate}%</div>
        </div>
        <div className="bg-editor-bg/50 border border-editor-muted/30 rounded-lg p-3">
          <div className="text-xs text-editor-muted mb-1">Net Errors</div>
          <div className="text-2xl font-bold">
            {mistakeData.totalMistakes - mistakeData.totalCorrections}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Character Confusions */}
        {mistakeData.characterSubstitutions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-orange-400">
              Character Confusions
            </h3>
            <p className="text-sm text-editor-muted mb-3">
              You typed these characters instead of the expected ones:
            </p>
            <div className="space-y-2">
              {mistakeData.characterSubstitutions.slice(0, 8).map((sub, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-orange-500/5 border border-orange-500/20 rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
                      Expected: <span className="font-bold text-green-400">&quot;{sub.expected}&quot;</span>
                    </span>
                    <span className="text-editor-muted">→</span>
                    <span className="font-mono text-sm">
                      Typed: <span className="font-bold text-orange-400">&quot;{sub.actual}&quot;</span>
                    </span>
                  </div>
                  <span className="font-mono font-bold text-orange-400">
                    {sub.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problematic Sequences */}
        {mistakeData.mistakeSequences.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-orange-400">
              Problem Sequences
            </h3>
            <p className="text-sm text-editor-muted mb-3">
              Sequences where you made mistakes:
            </p>
            <div className="space-y-2">
              {mistakeData.mistakeSequences.slice(0, 8).map((seq, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-orange-500/5 border border-orange-500/20 rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-editor-muted font-mono text-sm w-6">
                      #{index + 1}
                    </span>
                    <span className="font-mono text-lg font-bold text-orange-400">
                      &quot;{renderSequence(seq.sequence)}&quot;
                    </span>
                  </div>
                  <span className="font-mono font-bold text-orange-400">
                    {seq.frequency}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Commonly Mistyped Words */}
      {mistakeData.commonMistypedWords.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-orange-400">
            Most Mistyped Words
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mistakeData.commonMistypedWords.slice(0, 6).map((word, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-orange-500/5 border border-orange-500/20 rounded p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    Target: <span className="font-bold text-green-400">&quot;{word.target}&quot;</span>
                  </span>
                  <span className="text-editor-muted">→</span>
                  <span className="font-mono text-sm">
                    Typed: <span className="font-bold text-orange-400">&quot;{word.typed}&quot;</span>
                  </span>
                </div>
                <span className="font-mono font-bold text-orange-400">
                  {word.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded">
        <p className="text-sm text-editor-muted">
          <strong className="text-editor-fg">Tip:</strong> Practice these specific error patterns to improve your accuracy.
          Use the &quot;Practice My Mistakes&quot; button below to generate targeted practice content!
        </p>
      </div>
    </div>
  );
}
