'use client';

import { useState } from 'react';
import { useSettingsStore, ContentStyle } from '@/store/settings-store';
import { Sparkles, Settings2, X } from 'lucide-react';

interface LLMSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LLMSettings({ isOpen, onClose }: LLMSettingsProps) {
  const {
    llmModel,
    llmTemperature,
    defaultContentStyle,
    setLlmModel,
    setLlmTemperature,
    setDefaultContentStyle,
  } = useSettingsStore();

  const modelOptions = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Best Quality)' },
  ];

  const styleOptions: { value: ContentStyle; label: string; description: string }[] = [
    { value: 'ai-prose', label: 'Prose', description: 'Literary fiction style' },
    { value: 'ai-quote', label: 'Quote', description: 'Inspirational quotes' },
    { value: 'ai-technical', label: 'Technical', description: 'Programming docs' },
    { value: 'ai-common', label: 'Common', description: 'Everyday phrases' },
    { value: 'ai-sequences', label: 'Slowest Sequences', description: 'Practice weaknesses' },
    { value: 'ai-custom', label: 'Custom', description: 'Custom prompts' },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
    >
      <div className="bg-editor-bg border border-editor-muted rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-editor-bg border-b border-editor-muted p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-editor-accent" />
            <h2 className="text-xl font-bold">AI Content Generation Settings</h2>
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
          {/* Info about server-side key */}
          <div className="bg-editor-accent/10 border border-editor-accent/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-editor-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Server-Side API Key</p>
                <p className="text-editor-muted text-xs">
                  The OpenAI API key is configured securely on the server. You can customize the generation preferences below.
                </p>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            <select
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              className="w-full px-3 py-2 bg-editor-bg border border-editor-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
            >
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-editor-muted mt-1">
              GPT-4o Mini is recommended for cost-effectiveness
            </p>
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
              <span>More focused (0.0)</span>
              <span>More creative (1.0)</span>
            </div>
          </div>

          {/* Content Style */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Default Content Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {styleOptions.map((option) => (
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

          {/* Info Box */}
          <div className="bg-editor-accent/10 border border-editor-accent/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Settings2 className="w-5 h-5 text-editor-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">How it works</p>
                <ul className="text-editor-muted space-y-1 text-xs">
                  <li>• Generate unique typing tests using AI</li>
                  <li>• Choose topics and styles for custom content</li>
                  <li>• Practice specific character sequences</li>
                  <li>• API costs approximately $0.001-0.01 per test</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-editor-bg border-t border-editor-muted p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
