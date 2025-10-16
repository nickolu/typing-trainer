'use client';

import { useState } from 'react';
import { useSettingsStore, ContentStyle, isAIContentStyle } from '@/store/settings-store';
import { useUserStore } from '@/store/user-store';
import { X, BookOpen, Sparkles, Target } from 'lucide-react';

interface ContentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void; // Callback to regenerate content
}

export function ContentOptionsModal({ isOpen, onClose, onSave }: ContentOptionsModalProps) {
  const { currentUserId } = useUserStore();
  const {
    defaultContentStyle,
    customPrompt,
    llmModel,
    llmTemperature,
    customSequences,
    setDefaultContentStyle,
    setCustomPrompt,
    setLlmModel,
    setLlmTemperature,
    setCustomSequences,
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
    { value: 'ai-sequences', label: 'AI Character Sequence', description: 'Practice specific sequences' },
    { value: 'ai-custom', label: 'AI Custom', description: 'Custom AI prompt' },
  ];

  const [sequenceInput, setSequenceInput] = useState('');
  const [isLoadingSequences, setIsLoadingSequences] = useState(false);
  const [sequenceError, setSequenceError] = useState<string | null>(null);

  const modelOptions = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Best Quality)' },
  ];

  const handleAddSequence = () => {
    // Don't trim - preserve all spaces including leading/trailing
    const sequence = sequenceInput;
    // Only check that it's not empty (all spaces would be valid)
    if (sequence.length > 0 && !customSequences.includes(sequence)) {
      setCustomSequences([...customSequences, sequence]);
      setSequenceInput('');
    }
  };

  const handleRemoveSequence = (index: number) => {
    setCustomSequences(customSequences.filter((_, i) => i !== index));
  };

  const handleUseSlowestSequences = async () => {
    if (!currentUserId) {
      setSequenceError('User not authenticated');
      return;
    }

    setIsLoadingSequences(true);
    setSequenceError(null);
    try {
      const { getAggregateSlowSequences } = await import('@/lib/db/firebase');
      const slowSequences = await getAggregateSlowSequences(currentUserId, 5);
      if (slowSequences.length > 0) {
        setCustomSequences(slowSequences);
      } else {
        setSequenceError('No historical data available. Complete some tests first to identify your slowest sequences.');
      }
    } catch (error) {
      console.error('Failed to load slow sequences:', error);
      setSequenceError(error instanceof Error ? error.message : 'Failed to load sequences from history');
    } finally {
      setIsLoadingSequences(false);
    }
  };

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
                  onClick={() => {
                    if (!currentUserId) {
                      window.open('/login', '_blank');
                    } else {
                      setDefaultContentStyle(option.value);
                    }
                  }}
                  className={`p-3 rounded-lg border text-left transition-all relative ${
                    defaultContentStyle === option.value
                      ? 'border-purple-400 bg-purple-600/10'
                      : 'border-editor-muted hover:border-purple-400/50'
                  }`}
                >
                  {!currentUserId && (
                    <span className="absolute top-2 right-2 text-lg">🔒</span>
                  )}
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

              {/* Temperature and Model on one row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium mb-2">Temperature</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={llmTemperature}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0 && val <= 1) {
                        setLlmTemperature(val);
                      }
                    }}
                    className="w-full px-3 py-2 bg-editor-bg border border-editor-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
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
              </div>

              {/* Custom Prompt (for all AI styles except ai-sequences) */}
              {defaultContentStyle !== 'ai-sequences' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {defaultContentStyle === 'ai-custom' ? 'Custom Prompt' : 'Additional Instructions (Optional)'}
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={
                      defaultContentStyle === 'ai-custom'
                        ? 'Describe the content you want to generate...'
                        : 'Add optional instructions to customize the generated content...'
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-editor-bg border border-editor-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  />
                  {defaultContentStyle !== 'ai-custom' && (
                    <p className="text-xs text-editor-muted mt-1">
                      e.g., &quot;Include more technical terms&quot; or &quot;Focus on shorter sentences&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Character Sequences (only for ai-sequences style) */}
              {defaultContentStyle === 'ai-sequences' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      Character Sequences
                    </label>
                    <button
                      onClick={handleUseSlowestSequences}
                      disabled={isLoadingSequences}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded font-medium transition-colors"
                    >
                      <Target className={`w-3 h-3 ${isLoadingSequences ? 'animate-spin' : ''}`} />
                      {isLoadingSequences ? 'Loading...' : 'Use Slowest Sequences'}
                    </button>
                  </div>

                  {/* Error message */}
                  {sequenceError && (
                    <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                      {sequenceError}
                    </div>
                  )}

                  {/* Input for adding sequences */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={sequenceInput}
                      onChange={(e) => setSequenceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSequence();
                        }
                      }}
                      placeholder="Enter sequence (e.g., 'th', ' e ', 'qu')"
                      className="flex-1 px-3 py-2 bg-editor-bg border border-editor-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                    />
                    <button
                      onClick={handleAddSequence}
                      disabled={sequenceInput.length === 0}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>

                  {/* Display added sequences */}
                  {customSequences.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {customSequences.map((seq, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-1 bg-purple-600/20 border border-purple-600/40 rounded-full"
                        >
                          <span className="text-sm font-mono font-bold text-purple-300">
                            {seq.split('').map((char, idx) => (
                              char === ' ' ? (
                                <span key={idx} className="inline-block bg-purple-400/30 border border-purple-400/50 rounded px-0.5 mx-0.5">␣</span>
                              ) : (
                                <span key={idx}>{char}</span>
                              )
                            ))}
                          </span>
                          <button
                            onClick={() => handleRemoveSequence(i)}
                            className="hover:bg-purple-600/30 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3 text-purple-300" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-editor-muted">
                      Add character sequences you want to practice, or click &quot;Use Slowest Sequences&quot; to auto-fill based on your history.
                    </p>
                  )}
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
