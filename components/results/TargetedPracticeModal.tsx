import { useState, useMemo } from 'react';
import { X, Target } from 'lucide-react';
import { TestResult } from '@/lib/types';
import { calculateSequenceTimings } from '@/lib/test-engine/calculations';
import { analyzeMistakes } from '@/lib/test-engine/mistake-analysis';

interface PracticeOption {
  id: string;
  type: 'slow-2char' | 'slow-3char' | 'mistake-seq' | 'char-confusion' | 'mistyped-word';
  label: string;
  subLabel?: string;
  value: string;
}

interface TargetedPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TestResult;
  onGeneratePractice: (selectedSequences: string[], selectedWords: string[]) => void;
}

export function TargetedPracticeModal({
  isOpen,
  onClose,
  result,
  onGeneratePractice,
}: TargetedPracticeModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Calculate all available options
  const options = useMemo(() => {
    const opts: PracticeOption[] = [];

    // Slow 2-char sequences
    const twoCharSeqs = calculateSequenceTimings(result.keystrokeTimings, result.targetWords, 2, 10);
    twoCharSeqs.forEach((seq, idx) => {
      opts.push({
        id: `slow-2-${idx}`,
        type: 'slow-2char',
        label: seq.sequence,
        subLabel: `${seq.averageTime}ms avg`,
        value: seq.sequence,
      });
    });

    // Slow 3-char sequences
    const threeCharSeqs = calculateSequenceTimings(result.keystrokeTimings, result.targetWords, 3, 10);
    threeCharSeqs.forEach((seq, idx) => {
      opts.push({
        id: `slow-3-${idx}`,
        type: 'slow-3char',
        label: seq.sequence,
        subLabel: `${seq.averageTime}ms avg`,
        value: seq.sequence,
      });
    });

    // Mistake analysis
    if (result.keystrokeTimings && result.keystrokeTimings.length > 0) {
      const mistakeAnalysis = analyzeMistakes(
        result.keystrokeTimings,
        result.targetWords,
        result.typedWords
      );

      // Problem sequences
      mistakeAnalysis.mistakeSequences.slice(0, 10).forEach((seq, idx) => {
        opts.push({
          id: `mistake-seq-${idx}`,
          type: 'mistake-seq',
          label: seq.sequence,
          subLabel: `${seq.frequency}x mistakes`,
          value: seq.sequence,
        });
      });

      // Character confusions
      mistakeAnalysis.characterSubstitutions.slice(0, 10).forEach((sub, idx) => {
        // Create a sequence with the confused character
        const confusionSeq = sub.expected + sub.actual;
        opts.push({
          id: `char-confusion-${idx}`,
          type: 'char-confusion',
          label: `"${sub.expected}" → "${sub.actual}"`,
          subLabel: `${sub.count}x confused`,
          value: sub.expected, // Practice the expected character
        });
      });

      // Mistyped words (store as full words, not sequences)
      mistakeAnalysis.commonMistypedWords.slice(0, 10).forEach((word, idx) => {
        opts.push({
          id: `mistyped-word-${idx}`,
          type: 'mistyped-word',
          label: word.target,
          subLabel: `${word.count}x mistyped`,
          value: word.target,
        });
      });
    }

    return opts;
  }, [result]);

  // Group options by type
  const groupedOptions = useMemo(() => {
    return {
      'slow-2char': options.filter(o => o.type === 'slow-2char'),
      'slow-3char': options.filter(o => o.type === 'slow-3char'),
      'mistake-seq': options.filter(o => o.type === 'mistake-seq'),
      'char-confusion': options.filter(o => o.type === 'char-confusion'),
      'mistyped-word': options.filter(o => o.type === 'mistyped-word'),
    };
  }, [options]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 20) {
          return prev; // Max 20 selections
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectCategory = (category: keyof typeof groupedOptions) => {
    const categoryOptions = groupedOptions[category];
    const allSelected = categoryOptions.every(opt => selectedIds.has(opt.id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all in category
        categoryOptions.forEach(opt => next.delete(opt.id));
      } else {
        // Select all in category (up to limit)
        categoryOptions.forEach(opt => {
          if (next.size < 20) {
            next.add(opt.id);
          }
        });
      }
      return next;
    });
  };

  const handleGenerate = () => {
    const selected = options.filter(opt => selectedIds.has(opt.id));

    // Separate words from sequences
    const words = selected
      .filter(opt => opt.type === 'mistyped-word')
      .map(opt => opt.value);

    const sequences = selected
      .filter(opt => opt.type !== 'mistyped-word')
      .map(opt => opt.value);

    onGeneratePractice(sequences, words);
  };

  const renderSequence = (text: string) => {
    return text.split('').map((char, idx) => {
      if (char === ' ') {
        return (
          <span key={idx} className="inline-block bg-purple-400/30 border border-purple-400/50 rounded px-0.5 mx-0.5">
            ␣
          </span>
        );
      }
      return <span key={idx}>{char}</span>;
    });
  };

  const renderCategory = (
    title: string,
    category: keyof typeof groupedOptions,
    emptyMessage: string
  ) => {
    const categoryOptions = groupedOptions[category];
    if (categoryOptions.length === 0) return null;

    const allSelected = categoryOptions.every(opt => selectedIds.has(opt.id));
    const someSelected = categoryOptions.some(opt => selectedIds.has(opt.id));

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-editor-fg">{title}</h3>
          <button
            onClick={() => handleSelectCategory(category)}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="space-y-2">
          {categoryOptions.map(option => (
            <label
              key={option.id}
              className="flex items-center gap-3 p-3 bg-editor-bg/50 hover:bg-editor-bg/70 border border-editor-muted/30 rounded cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(option.id)}
                onChange={() => handleToggle(option.id)}
                disabled={!selectedIds.has(option.id) && selectedIds.size >= 20}
                className="w-4 h-4 text-purple-600 bg-editor-bg border-editor-muted rounded focus:ring-purple-500 focus:ring-2"
              />
              <div className="flex-1">
                <div className="font-mono font-bold text-editor-fg">
                  {renderSequence(option.label)}
                </div>
                {option.subLabel && (
                  <div className="text-xs text-editor-muted">{option.subLabel}</div>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-editor-bg border border-editor-muted rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-editor-muted">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-bold">Generate Targeted Practice</h2>
              <p className="text-sm text-editor-muted">
                Select up to 20 sequences or words to practice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-editor-muted hover:text-editor-fg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderCategory('Slow 2-Character Sequences', 'slow-2char', 'No slow 2-character sequences found')}
          {renderCategory('Slow 3-Character Sequences', 'slow-3char', 'No slow 3-character sequences found')}
          {renderCategory('Problem Sequences (Mistakes)', 'mistake-seq', 'No mistake sequences found')}
          {renderCategory('Character Confusions', 'char-confusion', 'No character confusions found')}
          {renderCategory('Commonly Mistyped Words', 'mistyped-word', 'No mistyped words found')}

          {options.length === 0 && (
            <div className="text-center py-8 text-editor-muted">
              <p>Not enough data to generate practice options.</p>
              <p className="text-sm mt-2">Complete more tests to see practice suggestions.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-editor-muted">
          <div className="text-sm text-editor-muted">
            {selectedIds.size} of 20 selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={selectedIds.size === 0}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              Generate Practice ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
