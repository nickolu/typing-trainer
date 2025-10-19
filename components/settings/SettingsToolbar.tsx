'use client';

import { useState } from 'react';
import { useSettingsStore, TestDuration, isAIContentStyle } from '@/store/settings-store';
import { useUserStore } from '@/store/user-store';
import { useTestStore } from '@/store/test-store';
import { Clock, Save, BookOpen, ShieldOff, Highlighter } from 'lucide-react';
import { ContentOptionsModal } from './ContentOptionsModal';
import { LabelSelector } from './LabelSelector';

interface SettingsToolbarProps {
  disabled?: boolean;
  onContentChange?: () => void; // Callback when content settings change
  showHighlightToggle?: boolean; // Only show in targeted practice mode
  isLoadingContent?: boolean; // Whether content is currently loading
}

export function SettingsToolbar({ disabled = false, onContentChange, showHighlightToggle = false, isLoadingContent = false }: SettingsToolbarProps) {
  const { isAuthenticated } = useUserStore();
  const {
    defaultDuration,
    autoSave,
    noBackspaceMode,
    showPracticeHighlights,
    defaultContentStyle,
    setDefaultDuration,
    setAutoSave,
    setNoBackspaceMode,
    setShowPracticeHighlights,
  } = useSettingsStore();

  const { testContentTitle, testContentCategory, userLabels, setUserLabels } = useTestStore();

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

  // Get content label and display text based on current test
  const getContentDisplay = () => {
    // Show loading state if content is being loaded/generated
    if (isLoadingContent) {
      return {
        category: 'Loading',
        title: 'Generating content...',
      };
    }

    // If we have actual test content loaded, use it
    if (testContentCategory && testContentTitle) {
      return {
        category: testContentCategory,
        title: testContentTitle,
      };
    }

    // Show loading if no content loaded yet
    return {
      category: 'Loading',
      title: 'Loading content...',
    };
  };

  const contentDisplay = getContentDisplay();

  return (
    <>
      <div className={`w-full bg-editor-bg/50 border border-editor-muted rounded-lg p-4 mb-6 transition-opacity ${
        disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="flex items-center justify-between gap-4">
          {/* Duration Selection */}
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-editor-accent" />
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

          {/* No Backspace Mode Toggle */}
          <div className="flex items-center gap-2 group relative">
            <ShieldOff className={`w-5 h-5 ${noBackspaceMode ? 'text-orange-400' : 'text-editor-muted'}`} />
            <button
              onClick={() => !disabled && setNoBackspaceMode(!noBackspaceMode)}
              disabled={disabled}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                noBackspaceMode ? 'bg-orange-500' : 'bg-editor-muted/30'
              }`}
              aria-label="Toggle no corrections mode"
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  noBackspaceMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            {/* Tooltip */}
            <div className="absolute left-0 top-full mt-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {noBackspaceMode
                ? 'Backspace is disabled. You cannot correct mistakes - focus on accuracy!'
                : 'Enable to disable backspace during tests. Forces you to type accurately without corrections.'}
            </div>
          </div>

          {/* Highlight Practice Sequences Toggle - Only in targeted practice mode */}
          {showHighlightToggle && (
            <div className="flex items-center gap-2 group relative">
              <Highlighter className={`w-5 h-5 ${showPracticeHighlights ? 'text-purple-400' : 'text-editor-muted'}`} />
              <button
                onClick={() => !disabled && setShowPracticeHighlights(!showPracticeHighlights)}
                disabled={disabled}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  showPracticeHighlights ? 'bg-purple-600' : 'bg-editor-muted/30'
                }`}
                aria-label="Toggle sequence highlights"
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    showPracticeHighlights ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              {/* Tooltip */}
              <div className="absolute left-0 top-full mt-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {showPracticeHighlights
                  ? 'Practice sequences are highlighted in purple to help you identify them as you type.'
                  : 'Enable to highlight the targeted practice sequences in the test content.'}
              </div>
            </div>
          )}

          {/* Save Results Toggle */}
          <div className="flex items-center gap-2 group relative">
            <Save className={`w-5 h-5 ${autoSave ? 'text-editor-accent' : 'text-editor-muted'}`} />
            <button
              onClick={() => !disabled && isAuthenticated && setAutoSave(!autoSave)}
              disabled={disabled || !isAuthenticated}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoSave ? 'bg-editor-accent' : 'bg-editor-muted/30'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Toggle save results"
              title={!isAuthenticated ? 'Sign in to save results' : ''}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  autoSave ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            {/* Tooltip */}
            <div className="absolute left-0 top-full mt-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {!isAuthenticated
                ? 'Sign in to save test results to your history.'
                : autoSave
                ? 'Test results will be saved to your history for tracking progress.'
                : 'Test results will NOT be saved. Use this for casual practice without affecting your stats.'}
            </div>
          </div>

          {/* Label Selector */}
          <LabelSelector
            selectedLabels={userLabels}
            onLabelsChange={setUserLabels}
            disabled={disabled}
          />

          {/* Content Selection Button - More Prominent with Tooltip */}
          <div className="ml-auto relative group">
            <button
              onClick={() => !disabled && setShowContentOptions(true)}
              disabled={disabled}
              className="flex items-center gap-3 px-6 py-2.5 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-all shadow-lg"
            >
              <BookOpen className="w-5 h-5 flex-shrink-0" />
              <div className="text-left min-w-0">
                <div className="text-xs opacity-75">{contentDisplay.category}</div>
                <div className="text-sm font-bold truncate max-w-[200px]">{contentDisplay.title}</div>
              </div>
            </button>
            {/* Tooltip showing full test information */}
            <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-gray-900 text-white text-sm rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
              <div className="font-bold mb-1">{contentDisplay.category}</div>
              <div className="text-xs opacity-90">{contentDisplay.title}</div>
            </div>
          </div>
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
