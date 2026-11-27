'use client';

import React from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { useUserStore } from '@/store/user-store';
import { KeyboardSelector } from '@/components/settings/KeyboardSelector';
import { ModelSelector } from '@/components/settings/ModelSelector';
import { resolveLlmModel } from '@/lib/llm/models';
import { Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const {
    showSpeedometer,
    showWPMOnSpeedometer,
    setShowSpeedometer,
    setShowWPMOnSpeedometer,
    currentKeyboard,
    setCurrentKeyboard,
    wpmGoal,
    setWpmGoal,
    llmModel,
    llmTemperature,
    setLlmModel,
    setLlmTemperature,
  } = useSettingsStore();
  const selectedModel = resolveLlmModel(llmModel);
  const { isAuthenticated } = useUserStore();
  const [showSaved, setShowSaved] = React.useState(false);

  const flashSaved = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleSettingChange = (setter: (value: boolean) => void, value: boolean) => {
    setter(value);
    flashSaved();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Settings Card */}
        <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Settings</h2>
            {showSaved && (
              <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400 flex items-center gap-2">
                <span className="text-base">✓</span>
                <span>Saved!</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Keyboard Setting */}
            <div className="border-b border-editor-muted/30 pb-6 last:border-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-editor-fg mb-1 block">
                    Current Keyboard
                  </label>
                  <p className="text-xs text-editor-muted">
                    Select your keyboard layout to automatically tag all tests.
                    This helps track performance across different keyboards.
                  </p>
                </div>
              </div>
              <KeyboardSelector
                selectedKeyboard={currentKeyboard}
                onKeyboardChange={setCurrentKeyboard}
                disabled={!isAuthenticated}
              />
            </div>

            {/* Display WPM Speedometer */}
            <div className="flex items-start justify-between py-3 border-b border-editor-muted/30">
              <div className="flex-1">
                <label htmlFor="show-speedometer" className="font-medium text-editor-fg cursor-pointer">
                  Display WPM speedometer
                </label>
                <p className="text-sm text-editor-muted mt-1">
                  Show the speedometer during typing tests
                </p>
              </div>
              <div className="flex items-center">
                <input
                  id="show-speedometer"
                  type="checkbox"
                  checked={showSpeedometer}
                  onChange={(e) => handleSettingChange(setShowSpeedometer, e.target.checked)}
                  className="w-5 h-5 rounded border-editor-muted bg-editor-bg-alt text-editor-accent focus:ring-2 focus:ring-editor-accent focus:ring-offset-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Mark my WPM score on speedometer */}
            <div className="flex items-start justify-between py-3">
              <div className="flex-1">
                <label htmlFor="show-wpm-score" className="font-medium text-editor-fg cursor-pointer">
                  Mark my WPM score on the speedometer
                </label>
                <p className="text-sm text-editor-muted mt-1">
                  Show your average WPM as a marker on the speedometer
                </p>
              </div>
              <div className="flex items-center">
                <input
                  id="show-wpm-score"
                  type="checkbox"
                  checked={showWPMOnSpeedometer}
                  onChange={(e) => handleSettingChange(setShowWPMOnSpeedometer, e.target.checked)}
                  disabled={!showSpeedometer}
                  className="w-5 h-5 rounded border-editor-muted bg-editor-bg-alt text-editor-accent focus:ring-2 focus:ring-editor-accent focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            {/* WPM Goal */}
            <div className="flex items-start justify-between py-3 border-t border-editor-muted/30">
              <div className="flex-1">
                <label htmlFor="wpm-goal" className="font-medium text-editor-fg">
                  WPM Goal
                </label>
                <p className="text-sm text-editor-muted mt-1">
                  Set a target WPM to track your progress on the stats page
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="wpm-goal"
                  type="number"
                  min="0"
                  max="300"
                  value={wpmGoal || ''}
                  placeholder="e.g. 80"
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setWpmGoal(Math.max(0, Math.min(300, val)));
                    setShowSaved(true);
                    setTimeout(() => setShowSaved(false), 2000);
                  }}
                  className="w-24 px-3 py-2 bg-editor-bg border border-editor-muted rounded text-editor-fg text-right font-mono focus:ring-2 focus:ring-editor-accent focus:border-editor-accent outline-none"
                />
                <span className="text-sm text-editor-muted">WPM</span>
              </div>
            </div>

            {/* AI Content Generation */}
            <div className="pt-6 border-t border-editor-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-editor-accent" />
                <h3 className="font-medium text-editor-fg">AI Content Generation</h3>
              </div>
              <p className="text-sm text-editor-muted mb-4">
                Choose which model generates AI typing passages. API keys are configured on the server.
              </p>

              <div className="space-y-4">
                {/* Model */}
                <div>
                  <label htmlFor="llm-model" className="text-sm font-medium text-editor-fg mb-1 block">
                    Model
                  </label>
                  <ModelSelector
                    id="llm-model"
                    value={llmModel}
                    onChange={(model) => {
                      setLlmModel(model);
                      flashSaved();
                    }}
                  />
                  <p className="text-xs text-editor-muted mt-1">
                    Claude Haiku 5.5 is the default: fast and inexpensive. Pick a higher tier for richer passages.
                  </p>
                </div>

                {/* Temperature */}
                <div>
                  <label htmlFor="llm-temperature" className="text-sm font-medium text-editor-fg mb-1 block">
                    Temperature: {llmTemperature.toFixed(1)}
                  </label>
                  <input
                    id="llm-temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={llmTemperature}
                    disabled={!selectedModel.supportsTemperature}
                    onChange={(e) => {
                      setLlmTemperature(parseFloat(e.target.value));
                      flashSaved();
                    }}
                    className="w-full accent-editor-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex justify-between text-xs text-editor-muted mt-1">
                    <span>More focused (0.0)</span>
                    <span>More creative (1.0)</span>
                  </div>
                  {!selectedModel.supportsTemperature && (
                    <p className="text-xs text-editor-muted mt-1">
                      {selectedModel.label} manages its own sampling; temperature is ignored for this model.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
