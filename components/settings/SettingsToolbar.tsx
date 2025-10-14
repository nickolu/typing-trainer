'use client';

import { useState } from 'react';
import { useSettingsStore, TestDuration, isAIContentStyle } from '@/store/settings-store';
import { Clock, Save, BookOpen } from 'lucide-react';
import { ContentOptionsModal } from './ContentOptionsModal';

interface SettingsToolbarProps {
  disabled?: boolean;
  onContentChange?: () => void; // Callback when content settings change
}

export function SettingsToolbar({ disabled = false, onContentChange }: SettingsToolbarProps) {
  const {
    defaultDuration,
    autoSave,
    defaultContentStyle,
    setDefaultDuration,
    setAutoSave,
  } = useSettingsStore();

  const [showContentOptions, setShowContentOptions] = useState(false);

  const durationOptions: { value: TestDuration; label: string }[] = [
    { value: 15, label: '15s' },
    { value: 30, label: '30s' },
    { value: 60, label: '60s' },
    { value: 120, label: '2m' },
  ];

  const handleContentChange = () => {
    if (onContentChange) {
      onContentChange();
    }
  };

  // Get content label based on current style
  const getContentLabel = () => {
    const isAI = isAIContentStyle(defaultContentStyle);
    const styleMap: Record<string, string> = {
      'random': 'Random',
      'quote': 'Quotes',
      'prose': 'Prose',
      'technical': 'Technical',
      'common': 'Common',
      'ai-prose': 'AI Prose',
      'ai-quote': 'AI Quotes',
      'ai-technical': 'AI Technical',
      'ai-common': 'AI Common',
      'ai-sequences': 'AI Weaknesses',
      'ai-custom': 'AI Custom',
    };
    return styleMap[defaultContentStyle] || 'Content';
  };

  return (
    <>
      <div className={`w-full bg-editor-bg/50 border border-editor-muted rounded-lg p-4 mb-6 transition-opacity ${
        disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          {/* Duration Selection */}
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-editor-accent" />
            <span className="text-sm font-medium text-editor-muted">Duration:</span>
            <div className="flex gap-2">
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => !disabled && setDefaultDuration(option.value)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    defaultDuration === option.value
                      ? 'bg-editor-accent text-white'
                      : 'bg-editor-muted/30 text-editor-muted hover:bg-editor-muted/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save Results / Practice Mode Toggle */}
          <div className="flex items-center gap-3">
            <Save className={`w-5 h-5 ${autoSave ? 'text-editor-accent' : 'text-purple-400'}`} />
            <span className="text-sm font-medium text-editor-muted">
              {autoSave ? 'Save Results' : 'Practice Mode'}
            </span>
            <button
              onClick={() => !disabled && setAutoSave(!autoSave)}
              disabled={disabled}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoSave ? 'bg-editor-accent' : 'bg-purple-600'
              }`}
              title={autoSave ? 'Click to enable Practice Mode (results won\'t be saved)' : 'Click to save results to history'}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  autoSave ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Content Selection Button - More Prominent */}
          <button
            onClick={() => !disabled && setShowContentOptions(true)}
            disabled={disabled}
            className="ml-auto flex items-center gap-3 px-6 py-2.5 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-all shadow-lg"
          >
            <BookOpen className="w-5 h-5" />
            <div className="text-left">
              <div className="text-xs opacity-75">Content</div>
              <div className="text-sm font-bold">{getContentLabel()}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Content Options Modal */}
      <ContentOptionsModal
        isOpen={showContentOptions}
        onClose={() => setShowContentOptions(false)}
        onSave={handleContentChange}
      />
    </>
  );
}
