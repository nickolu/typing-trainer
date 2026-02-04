'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, ContentStyle, isAIContentStyle } from '@/store/settings-store';
import { useUserStore } from '@/store/user-store';
import { X, BookOpen, Sparkles, Target, Lock, Award, Trophy, FileText } from 'lucide-react';
import { TimeTrialLeaderboardModal } from '@/components/time-trial/TimeTrialLeaderboardModal';

interface ContentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (contentStyle?: ContentStyle) => void; // Callback to regenerate content, optionally passing the selected style
}

type TabType = 'static' | 'time-trials' | 'ai';

export function ContentOptionsModal({ isOpen, onClose, onSave }: ContentOptionsModalProps) {
  const { currentUserId } = useUserStore();
  const {
    defaultContentStyle,
    customText,
    customTextRepeat,
    customPrompt,
    llmModel,
    llmTemperature,
    customSequences,
    setDefaultContentStyle,
    setCustomText,
    setCustomTextRepeat,
    setCustomPrompt,
    setLlmModel,
    setLlmTemperature,
    setCustomSequences,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<TabType>('static');

  const staticOptions: { value: ContentStyle; label: string; description: string }[] = [
    { value: 'random', label: 'Random', description: 'Mixed content from library' },
    { value: 'quote', label: 'Quotes', description: 'Famous quotes' },
    { value: 'prose', label: 'Prose', description: 'Literary passages' },
    { value: 'technical', label: 'Technical', description: 'Programming text' },
    { value: 'common', label: 'Common', description: 'Everyday phrases' },
    { value: 'benchmark', label: 'Benchmark', description: 'Standardized test' },
    { value: 'custom-text', label: 'Custom Text', description: 'Use your own text' },
    { value: 'bigrams', label: 'Bigrams', description: '2-char sequences' },
    { value: 'trigrams', label: 'Trigrams', description: '3-char sequences' },
    { value: 'tetragrams', label: 'Tetragrams', description: '4-char sequences' },
    { value: 'special-chars', label: 'Special Characters', description: 'Practice symbols' },
    { value: 'code-typescript', label: 'Code: TypeScript', description: 'TypeScript snippets' },
    { value: 'code-python', label: 'Code: Python', description: 'Python snippets' },
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

  // Time trial best times
  const [bestTimes, setBestTimes] = useState<Record<string, number>>({});
  const [isLoadingBestTimes, setIsLoadingBestTimes] = useState(false);

  // Leaderboard modal state
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [selectedTrialId, setSelectedTrialId] = useState<string>('');
  const [selectedTrialName, setSelectedTrialName] = useState<string>('');

  // Time trial options
  const timeTrialOptions: { value: ContentStyle; label: string; trialId: string }[] = [
    { value: 'time-trial-001', label: 'Novice Sprint', trialId: 'time-trial-001' },
    { value: 'time-trial-002', label: 'Intermediate Challenge', trialId: 'time-trial-002' },
    { value: 'time-trial-003', label: 'Advanced Velocity', trialId: 'time-trial-003' },
    { value: 'time-trial-004', label: 'Expert Gauntlet', trialId: 'time-trial-004' },
    { value: 'time-trial-005', label: 'Master Marathon', trialId: 'time-trial-005' },
    { value: 'time-trial-006', label: 'Grandmaster Crucible', trialId: 'time-trial-006' },
  ];

  // Load best times when modal opens
  useEffect(() => {
    if (isOpen && currentUserId) {
      setIsLoadingBestTimes(true);
      import('@/lib/db').then(({ getAllTimeTrialBestTimes }) => {
        getAllTimeTrialBestTimes(currentUserId).then((times) => {
          setBestTimes(times);
          setIsLoadingBestTimes(false);
        }).catch((error) => {
          console.error('Failed to load best times:', error);
          setIsLoadingBestTimes(false);
        });
      });
    }
  }, [isOpen, currentUserId]);

  // Set initial tab based on current content style
  useEffect(() => {
    if (isOpen) {
      if (isAIContentStyle(defaultContentStyle)) {
        setActiveTab('ai');
      } else if (defaultContentStyle.startsWith('time-trial-')) {
        setActiveTab('time-trials');
      } else {
        setActiveTab('static');
      }
    }
  }, [isOpen, defaultContentStyle]);

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
      const { getAggregateSlowSequences } = await import('@/lib/db');
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

  const handleSave = (contentStyle?: ContentStyle) => {
    if (onSave) {
      onSave(contentStyle);
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

        {/* Tabs */}
        <div className="border-b border-editor-muted">
          <div className="flex gap-1 px-6">
            <button
              onClick={() => setActiveTab('static')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === 'static'
                  ? 'text-editor-accent border-b-2 border-editor-accent'
                  : 'text-editor-muted hover:text-editor-fg'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Static
            </button>
            <button
              onClick={() => setActiveTab('time-trials')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === 'time-trials'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-editor-muted hover:text-editor-fg'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Time Trials
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                activeTab === 'ai'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-editor-muted hover:text-editor-fg'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Generated
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Static Tab Content */}
          {activeTab === 'static' && (
            <>
              {/* Static Content Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-editor-accent" />
                  <h3 className="font-bold text-sm">Library Content</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {staticOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDefaultContentStyle(option.value);
                        // Custom text needs to stay on this screen, others apply immediately
                        if (option.value !== 'custom-text') {
                          handleSave(option.value);
                        }
                      }}
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

              {/* Custom Text Editor (only show when custom-text is selected) */}
              {defaultContentStyle === 'custom-text' && (
                <div className="bg-editor-accent/10 border border-editor-accent/30 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-editor-accent" />
                    <h3 className="font-bold text-sm text-editor-accent">Custom Text</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Paste Your Text
                    </label>
                    <textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Paste any text you want to practice typing..."
                      rows={8}
                      className="w-full px-3 py-2 bg-editor-bg border border-editor-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent resize-none font-mono text-sm"
                    />
                    <p className="text-xs text-editor-muted mt-2">
                      Your custom text will be used for typing practice. Make sure to paste at least a few sentences for the best experience.
                    </p>
                    {customText.trim().length === 0 && (
                      <p className="text-xs text-red-400 mt-2">
                        Please paste some text before starting the test.
                      </p>
                    )}
                  </div>
                  
                  {/* Repeat Options */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Repetition
                    </label>
                    <select
                      value={customTextRepeat}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'once' || value === 'fill-duration') {
                          setCustomTextRepeat(value);
                        } else {
                          setCustomTextRepeat(parseInt(value, 10));
                        }
                      }}
                      className="w-full px-3 py-2 bg-editor-bg border border-editor-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    >
                      <option value="once">Once (no repeat)</option>
                      <option value="2">Repeat 2 times</option>
                      <option value="3">Repeat 3 times</option>
                      <option value="5">Repeat 5 times</option>
                      <option value="10">Repeat 10 times</option>
                      <option value="fill-duration">Fill test duration</option>
                    </select>
                    <p className="text-xs text-editor-muted mt-2">
                      {customTextRepeat === 'once'
                        ? 'The text will be used once without repetition.'
                        : customTextRepeat === 'fill-duration'
                        ? 'The text will repeat as needed to fill the selected test duration.'
                        : `The text will repeat exactly ${customTextRepeat} times.`}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Time Trials Tab Content */}
          {activeTab === 'time-trials' && (
            <>
              {/* Time Trials Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <h3 className="font-bold text-sm">Time Trials</h3>
                  <span className="text-xs text-editor-muted">(Race the clock!)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {timeTrialOptions.map((option) => {
                    const bestTime = bestTimes[option.trialId];
                    const hasBestTime = bestTime !== undefined;

                    return (
                      <div key={option.value} className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            setDefaultContentStyle(option.value);
                            handleSave(option.value);
                          }}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            defaultContentStyle === option.value
                              ? 'border-yellow-400 bg-yellow-600/10'
                              : 'border-editor-muted hover:border-yellow-400/50'
                          }`}
                        >
                          <div className="font-medium text-sm flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-yellow-400" />
                            {option.label}
                          </div>
                          <div className="text-xs mt-1">
                            {isLoadingBestTimes ? (
                              <span className="text-editor-muted">Loading...</span>
                            ) : hasBestTime ? (
                              <span className="text-yellow-400 font-medium">Best: {bestTime.toFixed(1)}s</span>
                            ) : (
                              <span className="text-editor-muted">Not Attempted</span>
                            )}
                          </div>
                        </button>
                        {currentUserId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrialId(option.trialId);
                              setSelectedTrialName(option.label);
                              setLeaderboardModalOpen(true);
                            }}
                            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors py-1 px-2 rounded hover:bg-yellow-400/10"
                          >
                            🏆 View Rankings
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-editor-muted mt-2">
                  Time trials use strict mode and content-length duration. Complete the passage as fast as you can!
                </p>
              </div>
            </>
          )}

          {/* AI Tab Content */}
          {activeTab === 'ai' && (
            <>
              {/* AI Content Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-sm">AI Content Options</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {aiOptions.map((option) => (
                    <div key={option.value} className="relative group">
                      <button
                        onClick={() => {
                          if (currentUserId) {
                            setDefaultContentStyle(option.value);
                          }
                        }}
                        disabled={!currentUserId}
                        className={`w-full p-3 rounded-lg border text-left transition-all relative ${
                          defaultContentStyle === option.value
                            ? 'border-purple-400 bg-purple-600/10'
                            : currentUserId
                            ? 'border-editor-muted hover:border-purple-400/50'
                            : 'border-editor-muted/30 bg-editor-muted/10 cursor-not-allowed'
                        }`}
                      >
                        {!currentUserId && (
                          <Lock className="absolute top-2 right-2 w-4 h-4 text-editor-muted" />
                        )}
                        <div className={`font-medium text-sm ${!currentUserId ? 'text-editor-muted' : ''}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-editor-muted mt-1">
                          {option.description}
                        </div>
                      </button>
                      {/* Tooltip for locked items */}
                      {!currentUserId && (
                        <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          Create an account or log in to use AI content
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

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
            {isAISelected
              ? 'Content will be generated with AI'
              : defaultContentStyle === 'custom-text'
              ? 'Your custom text will be used'
              : 'Content will be loaded from library'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(defaultContentStyle)}
              disabled={defaultContentStyle === 'custom-text' && customText.trim().length === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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

      {/* Leaderboard Modal */}
      {leaderboardModalOpen && (
        <TimeTrialLeaderboardModal
          isOpen={leaderboardModalOpen}
          onClose={() => setLeaderboardModalOpen(false)}
          trialId={selectedTrialId}
          trialName={selectedTrialName}
          userId={currentUserId || undefined}
        />
      )}
    </div>
  );
}
