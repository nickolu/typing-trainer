'use client';

import { useState } from 'react';
import { useSettingsStore, ContentStyle } from '@/store/settings-store';
import { useUserStore } from '@/store/user-store';
import { ContentOptionsModal } from '@/components/settings/ContentOptionsModal';
import { Lock } from 'lucide-react';

const mainOptions: { value: ContentStyle; label: string; description: string; icon: string }[] = [
  { value: 'random', label: 'Random Mix', description: 'Mixed content from the library', icon: '🎲' },
  { value: 'quote', label: 'Quotes', description: 'Famous quotes', icon: '💬' },
  { value: 'prose', label: 'Prose', description: 'Literary fiction excerpts', icon: '📖' },
  { value: 'technical', label: 'Technical', description: 'Programming documentation', icon: '💻' },
  { value: 'common', label: 'Common Words', description: 'Everyday vocabulary', icon: '📝' },
  { value: 'custom-text', label: 'Custom Text', description: 'Paste your own text', icon: '✏️' },
];

const aiMainOptions: { value: ContentStyle; label: string; description: string }[] = [
  { value: 'ai-prose', label: 'AI Prose', description: 'AI-generated fiction' },
  { value: 'ai-quote', label: 'AI Quote', description: 'AI-generated quotes' },
  { value: 'ai-custom', label: 'AI Custom', description: 'Your own AI prompt' },
];

export function ContentPicker() {
  const { defaultContentStyle, setDefaultContentStyle, setHasUserSelectedContent } = useSettingsStore();
  const { currentUserId } = useUserStore();
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (style: ContentStyle) => {
    if (style === 'custom-text') {
      setDefaultContentStyle(style);
      setShowModal(true);
      return;
    }
    setDefaultContentStyle(style);
    setHasUserSelectedContent(true);
  };

  const handleModalSave = (style?: ContentStyle) => {
    if (style) setDefaultContentStyle(style);
    setHasUserSelectedContent(true);
    setShowModal(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">What would you like to practice today?</h1>
      <p className="text-editor-muted mb-8">Choose a content type to get started</p>

      {/* Main content cards */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {mainOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`p-4 rounded-lg border cursor-pointer transition-all text-left ${
              defaultContentStyle === option.value
                ? 'border-editor-accent bg-editor-accent/10'
                : 'border-editor-muted hover:border-editor-accent'
            }`}
          >
            <div className="text-2xl mb-2">{option.icon}</div>
            <div className="font-medium text-sm">{option.label}</div>
            <div className="text-xs text-editor-muted mt-1">{option.description}</div>
          </button>
        ))}
      </div>

      {/* AI Generated section */}
      <div className="w-full mb-6">
        <p className="text-sm font-medium text-editor-muted mb-3">AI Generated</p>
        {currentUserId ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {aiMainOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`p-4 rounded-lg border cursor-pointer transition-all text-left ${
                  defaultContentStyle === option.value
                    ? 'border-editor-accent bg-editor-accent/10'
                    : 'border-editor-muted hover:border-editor-accent'
                }`}
              >
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-editor-muted mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-editor-muted p-3 rounded-lg border border-editor-muted/50">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Sign in to use AI features</span>
          </div>
        )}
      </div>

      {/* More options button */}
      <button
        onClick={() => setShowModal(true)}
        className="text-sm text-editor-muted hover:text-editor-fg transition-colors underline underline-offset-2"
      >
        More options...
      </button>

      <ContentOptionsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleModalSave}
      />
    </div>
  );
}
