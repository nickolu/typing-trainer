'use client';

import { Award, Clock, Info, RefreshCw, X } from 'lucide-react';
import { WPMStatus } from '@/components/typing-test/hooks/useWPMStatus';

interface BenchmarkInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  wpmStatus: WPMStatus | null;
}

export function BenchmarkInfoDialog({ isOpen, onClose, wpmStatus }: BenchmarkInfoDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
    >
      <div
        className="bg-editor-bg border border-editor-muted rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-editor-bg border-b border-editor-muted p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-editor-accent" />
            <h2 className="text-xl font-bold text-editor-fg">Benchmark Test</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-editor-muted/30 rounded-lg transition-colors text-editor-muted hover:text-editor-fg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* What is a Benchmark Test */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-editor-accent" />
              <h3 className="font-semibold text-editor-fg">What is a Benchmark Test?</h3>
            </div>
            <p className="text-sm text-editor-muted leading-relaxed">
              A standardized 2-minute typing test that establishes your official WPM score.
            </p>
          </div>

          {/* How Scoring Works */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-editor-accent" />
              <h3 className="font-semibold text-editor-fg">How Scoring Works</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-editor-muted/10 rounded-lg border border-editor-muted/20">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-editor-fg">First benchmark</p>
                  <p className="text-xs text-editor-muted">Your score is set directly from your result.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-editor-muted/10 rounded-lg border border-editor-muted/20">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-editor-fg">After 30+ days</p>
                  <p className="text-xs text-editor-muted">New score is averaged with your current score.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-editor-muted/10 rounded-lg border border-editor-muted/20">
                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-editor-fg">Within 30 days</p>
                  <p className="text-xs text-editor-muted">Score cannot be updated yet — come back after 30 days.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Score Reset */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-editor-accent" />
              <h3 className="font-semibold text-editor-fg">Score Reset</h3>
            </div>
            <p className="text-sm text-editor-muted leading-relaxed">
              Scores reset after 6 months of inactivity. Each new benchmark extends the reset date by 6 months.
            </p>
          </div>

          {/* Personalized Status */}
          {wpmStatus && (
            <div className="space-y-3 pt-2 border-t border-editor-muted">
              <h3 className="font-semibold text-editor-fg">Your Status</h3>

              {/* Current Score */}
              {wpmStatus.hasScore && wpmStatus.currentScore !== null ? (
                <div className="flex items-center justify-between p-3 bg-editor-accent/10 border border-editor-accent/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-editor-accent" />
                    <span className="text-sm text-editor-fg">Current Score</span>
                  </div>
                  <span className="text-lg font-bold text-editor-accent">{wpmStatus.currentScore} WPM</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-editor-muted/10 border border-editor-muted/20 rounded-lg">
                  <Info className="w-4 h-4 text-editor-muted" />
                  <span className="text-sm text-editor-muted">No benchmark score yet — take a test to set one!</span>
                </div>
              )}

              {/* Update Eligibility */}
              {wpmStatus.hasScore && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  wpmStatus.canUpdate
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-yellow-500/10 border-yellow-500/20'
                }`}>
                  <Clock className={`w-4 h-4 ${wpmStatus.canUpdate ? 'text-green-400' : 'text-yellow-400'}`} />
                  <span className={`text-sm ${wpmStatus.canUpdate ? 'text-green-300' : 'text-yellow-300'}`}>
                    {wpmStatus.canUpdate
                      ? 'You can update your score now.'
                      : `Score locked — ${wpmStatus.daysUntilUpdate} day${wpmStatus.daysUntilUpdate === 1 ? '' : 's'} until next update allowed.`
                    }
                  </span>
                </div>
              )}

              {/* Days Until Reset */}
              {wpmStatus.hasScore && wpmStatus.daysUntilReset !== null && (
                <div className="flex items-center gap-2 p-3 bg-editor-muted/10 border border-editor-muted/20 rounded-lg">
                  <RefreshCw className="w-4 h-4 text-editor-muted" />
                  <span className="text-sm text-editor-muted">
                    Score resets in{' '}
                    <span className="font-medium text-editor-fg">{wpmStatus.daysUntilReset} days</span>
                    {wpmStatus.resetDate && (
                      <> ({wpmStatus.resetDate.toLocaleDateString()})</>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
