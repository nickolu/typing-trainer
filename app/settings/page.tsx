'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useSettingsStore } from '@/store/settings-store';

export default function SettingsPage() {
  const router = useRouter();
  const { showSpeedometer, showWPMOnSpeedometer, setShowSpeedometer, setShowWPMOnSpeedometer } = useSettingsStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 bg-editor-bg-alt border border-editor-muted hover:bg-editor-muted/30 text-editor-fg rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Settings Card */}
        <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Speedometer Settings</h2>

          <div className="space-y-4">
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
