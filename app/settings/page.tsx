'use client';

import { useSettingsStore } from '@/store/settings-store';
import { useUserStore } from '@/store/user-store';
import { KeyboardSelector } from '@/components/settings/KeyboardSelector';

export default function SettingsPage() {
  const { showSpeedometer, showWPMOnSpeedometer, setShowSpeedometer, setShowWPMOnSpeedometer, currentKeyboard, setCurrentKeyboard } = useSettingsStore();
  const { isAuthenticated } = useUserStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Settings Card */}
        <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Settings</h2>

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
                  onChange={(e) => setShowSpeedometer(e.target.checked)}
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
                  onChange={(e) => setShowWPMOnSpeedometer(e.target.checked)}
                  disabled={!showSpeedometer}
                  className="w-5 h-5 rounded border-editor-muted bg-editor-bg-alt text-editor-accent focus:ring-2 focus:ring-editor-accent focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
