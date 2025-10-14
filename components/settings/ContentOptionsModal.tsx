'use client';

import { useSettingsStore, ContentStyle, isAIContentStyle } from '@/store/settings-store';
import { X, BookOpen, Sparkles } from 'lucide-react';

interface ContentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void; // Callback to regenerate content
}

export function ContentOptionsModal({ isOpen, onClose, onSave }: ContentOptionsModalProps) {
  const {
    defaultContentStyle,
    customPrompt,
    llmModel,
    llmTemperature,
    setDefaultContentStyle,
    setCustomPrompt,
    setLlmModel,
    setLlmTemperature,
  } = useSettingsStore();

  const staticOptions: { value: ContentStyle; label: string; description: string }[] = [
    { value: 'random', label: 'Random', description: 'Mixed content from library' },
    { value: 'quote', label: 'Quotes', description: 'Famous quotes' },
    { value: 'prose', label: 'Prose', description: 'Literary passages' },
    { value: 'technical', label: 'Technical', description: 'Programming text' },
    { value: 'common', label: 'Common', description: 'Everyday phrases' },
  ];

  const aiOptions: { value: ContentStyle; label: string; description: string }[] = [
    { value: 'ai-prose', label: 'AI Prose', description: 'Generated fiction' },
    { value: 'ai-quote', label: 'AI Quotes', description: 'Generated quotes' },
    { value: 'ai-technical', label: 'AI Technical', description: 'Generated code docs' },
    { value: 'ai-common', label: 'AI Common', description: 'Generated phrases' },
    { value: 'ai-sequences', label: 'AI Weaknesses', description: 'Practice slow sequences' },
    { value: 'ai-custom', label: 'AI Custom', description: 'Custom AI prompt' },
  ];

  const modelOptions = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Best Quality)' },
  ];

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
    onClose();
  };

  if (!isOpen) return null;

  const isAISelected = isAIContentStyle(defaultContentStyle);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
    >
      <div className="bg-editor-bg border border-editor-muted rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-editor-bg border-b border-editor-muted p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-editor-accent" />
            <h2 className="text-xl font-bold">Content Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-editor-muted/30 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Static Content Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-editor-accent" />
              <h3 className="font-bold text-sm">Static Content (From Library)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {staticOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDefaultContentStyle(option.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    defaultContentStyle === option.value
                      ? 'border-editor-accent bg-editor-accent/10'
                      : 'border-editor-muted hover:border-editor-accent/50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-editor-muted mt-1">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Content Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-sm">AI-Generated Content</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {aiOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDefaultContentStyle(option.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    defaultContentStyle === option.value
                      ? 'border-purple-400 bg-purple-600/10'
                      : 'border-editor-muted hover:border-purple-400/50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-editor-muted mt-1">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Options (only show when AI style is selected) */}
          {isAISelected && (
            <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-purple-400">AI Settings</h3>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="w-full px-3 py-2 bg-editor-bg border border-editor-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Temperature: {llmTemperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={llmTemperature}
                  onChange={(e) => setLlmTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-editor-muted mt-1">
                  <span>Focused</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Custom Prompt (only for ai-custom style) */}
              {defaultContentStyle === 'ai-custom' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Custom Prompt
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe the content you want to generate..."
                    rows={4}
                    className="w-full px-3 py-2 bg-editor-bg border border-editor-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-editor-bg border-t border-editor-muted p-4 flex justify-between items-center gap-3">
          <p className="text-xs text-editor-muted">
            {isAISelected ? 'Content will be generated with AI' : 'Content will be loaded from library'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isAISelected
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-editor-accent hover:bg-editor-accent/80 text-white'
              }`}
            >
              Apply & Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
