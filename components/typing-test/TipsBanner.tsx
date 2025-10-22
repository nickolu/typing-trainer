'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const TIPS = [
  'The timer shows your time limit (or word count in content-length mode) before you start typing',
  'You can choose content-length from the time length menu if you prefer to type a fixed number of words instead of a time limit',
  'Use labels to flag tests taken on different keyboards or devices',
  'Use AI Character Sequence from the content menu to generate a test based on your weakest key strokes to improve your speed and accuracy',
  "Typing without looking is essential to typing quickly. Tape a piece of paper to your keyboard to cover your hands while you type if you struggle to break this habit.",
  'You can see your progress and weakest key sequences in the stats page',
  "Check out the stats page to see your accuracy and WPM over time",
  "You can also generate a practice test based on your weakest key strokes to improve your speed and accuracy",
  "Take a benchmark test to see how you do on a standardized challenge",
  "Use the AI Custom option in the content menu to generate tests for the areas you want to improve on most",
  "Take benchmark tests to earn an official WPM score that appears next to your name. Your score updates by averaging old and new scores every 30 days."
];

export function TipsBanner() {
  const [currentTip, setCurrentTip] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Select a random tip when component mounts
    const randomIndex = Math.floor(Math.random() * TIPS.length);
    setCurrentTip(TIPS[randomIndex]);
  }, []);

  if (!currentTip || isDismissed) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mt-4">
      <div className="bg-editor-muted/20 border border-editor-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <span className="text-base opacity-60">💡</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-editor-muted"><strong>Tip:</strong> {currentTip}</p>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 text-editor-muted hover:text-editor-fg transition-colors"
            aria-label="Dismiss tip"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
