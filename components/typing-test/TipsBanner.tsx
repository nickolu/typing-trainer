'use client';

import { useState, useEffect } from 'react';

const TIPS = [
  'Use labels to flag tests taken on different keyboards or devices',
  'Generate a test based on your weakest key strokes to improve your speed and accuracy',
  "Typing without looking is essential to typing quickly. Tape a piece of paper to your keyboard to cover your hands while you type if you struggle to break this habit.",
  'You can see your progress and weakest key sequences in the stats page',
];

export function TipsBanner() {
  const [currentTip, setCurrentTip] = useState('');

  useEffect(() => {
    // Select a random tip when component mounts
    const randomIndex = Math.floor(Math.random() * TIPS.length);
    setCurrentTip(TIPS[randomIndex]);
  }, []);

  if (!currentTip) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mt-4">
      <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <span className="text-xl">💡</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-400 mb-1">Tip</h3>
            <p className="text-sm text-editor-fg">{currentTip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
