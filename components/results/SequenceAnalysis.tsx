import { SequenceTiming } from '@/lib/test-engine/calculations';

interface SequenceAnalysisProps {
  twoCharSequences: SequenceTiming[];
  threeCharSequences: SequenceTiming[];
}

export function SequenceAnalysis({
  twoCharSequences,
  threeCharSequences,
}: SequenceAnalysisProps) {
  const formatSequence = (seq: string) => {
    // Replace space with visible character
    return seq.replace(/ /g, '␣');
  };

  if (twoCharSequences.length === 0 && threeCharSequences.length === 0) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Character Sequence Analysis</h2>
        <p className="text-editor-muted text-center py-4">
          Not enough data to analyze character sequences. Type more words to see your slowest sequences!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Slowest Character Sequences</h2>
      <p className="text-editor-muted mb-6 text-sm">
        These sequences take you the longest to type. Practice them to improve your speed!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2-Character Sequences */}
        {twoCharSequences.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-editor-accent">
              2-Character Sequences
            </h3>
            <div className="space-y-2">
              {twoCharSequences.map((seq, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-editor-bg/50 border border-editor-muted/30 rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-editor-muted font-mono text-sm w-6">
                      #{index + 1}
                    </span>
                    <span className="font-mono text-lg font-bold">
                      &quot;{formatSequence(seq.sequence)}&quot;
                    </span>
                    <span className="text-editor-muted text-sm">
                      ({seq.occurrences}x)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-editor-error">
                    {seq.averageTime}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3-Character Sequences */}
        {threeCharSequences.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-editor-accent">
              3-Character Sequences
            </h3>
            <div className="space-y-2">
              {threeCharSequences.map((seq, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-editor-bg/50 border border-editor-muted/30 rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-editor-muted font-mono text-sm w-6">
                      #{index + 1}
                    </span>
                    <span className="font-mono text-lg font-bold">
                      &quot;{formatSequence(seq.sequence)}&quot;
                    </span>
                    <span className="text-editor-muted text-sm">
                      ({seq.occurrences}x)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-editor-error">
                    {seq.averageTime}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-editor-accent/10 border border-editor-accent/30 rounded">
        <p className="text-sm text-editor-muted">
          <strong className="text-editor-fg">Tip:</strong> Focus on practicing these slow sequences to improve your overall typing speed.
          Lower times are better!
        </p>
      </div>
    </div>
  );
}
