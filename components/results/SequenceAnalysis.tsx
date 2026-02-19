import { NgramStats, getTopSlowNgrams } from '@/lib/db/ngram-stats';

interface SequenceAnalysisProps {
  ngramStats: NgramStats | null;
  isLoading?: boolean;
  onPracticeNgrams?: (ngrams: string[]) => void;
}

export function SequenceAnalysis({
  ngramStats,
  isLoading,
  onPracticeNgrams,
}: SequenceAnalysisProps) {
  const renderSequence = (seq: string) => {
    return seq.split('').map((char, idx) => {
      if (char === ' ') {
        return (
          <span key={idx} className="inline-block bg-editor-accent/20 border border-editor-accent/40 rounded px-1 mx-0.5">
            ␣
          </span>
        );
      }
      return <span key={idx}>{char}</span>;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Ngram Speed Tracker</h2>
        <p className="text-editor-muted text-center py-4">
          Updating your ngram stats...
        </p>
      </div>
    );
  }

  if (!ngramStats) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Ngram Speed Tracker</h2>
        <p className="text-editor-muted text-center py-4">
          Sign in to track your slowest bigrams, trigrams, and tetragrams across sessions.
        </p>
      </div>
    );
  }

  const bigrams = getTopSlowNgrams(ngramStats, 'bigrams', 10, 3);
  const trigrams = getTopSlowNgrams(ngramStats, 'trigrams', 10, 3);
  const tetragrams = getTopSlowNgrams(ngramStats, 'tetragrams', 10, 3);

  const hasData = bigrams.length > 0 || trigrams.length > 0 || tetragrams.length > 0;

  if (!hasData) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Ngram Speed Tracker</h2>
        <p className="text-editor-muted text-center py-4">
          Complete more tests to build up ngram data (sequences need at least 3 occurrences).
        </p>
      </div>
    );
  }

  const renderSection = (
    title: string,
    items: Array<{ sequence: string; avgTime: number; count: number }>
  ) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h3 className="text-base font-semibold mb-3 text-editor-accent">{title}</h3>
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-editor-bg/50 border border-editor-muted/30 rounded px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-editor-muted font-mono text-xs w-5">
                  #{index + 1}
                </span>
                <span className="font-mono text-base font-bold">
                  &quot;{renderSequence(item.sequence)}&quot;
                </span>
                <span className="text-editor-muted text-xs">
                  ({item.count}x)
                </span>
              </div>
              <span className="font-mono font-bold text-editor-error text-sm">
                {item.avgTime}ms
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const top5Tetragrams = getTopSlowNgrams(ngramStats, 'tetragrams', 5, 3).map(t => t.sequence);

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
      <h2 className="text-xl font-bold mb-2">Ngram Speed Tracker</h2>
      <p className="text-editor-muted mb-6 text-sm">
        Your slowest typing sequences across all sessions. Lower is better!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderSection('Bigrams', bigrams)}
        {renderSection('Trigrams', trigrams)}
        {renderSection('Tetragrams', tetragrams)}
      </div>

      {top5Tetragrams.length > 0 && onPracticeNgrams && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onPracticeNgrams(top5Tetragrams)}
            className="px-5 py-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Practice Slowest Tetragrams
          </button>
        </div>
      )}
    </div>
  );
}
