'use client';

import { useSettingsStore, TestDuration } from '@/store/settings-store';
import { Clock, Save } from 'lucide-react';

export function SettingsToolbar() {
  const { defaultDuration, autoSave, setDefaultDuration, setAutoSave } = useSettingsStore();

  const durationOptions: { value: TestDuration; label: string }[] = [
    { value: 15, label: '15s' },
    { value: 30, label: '30s' },
    { value: 60, label: '60s' },
    { value: 120, label: '2m' },
  ];

  return (
    <div className="w-full bg-editor-bg/50 border border-editor-muted rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-6">
        {/* Duration Selection */}
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-editor-accent" />
          <span className="text-sm font-medium text-editor-muted">Duration:</span>
          <div className="flex gap-2">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDefaultDuration(option.value)}
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

        {/* Auto-save Toggle */}
        <div className="flex items-center gap-3">
          <Save className="w-5 h-5 text-editor-accent" />
          <span className="text-sm font-medium text-editor-muted">Auto-save:</span>
          <button
            onClick={() => setAutoSave(!autoSave)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              autoSave ? 'bg-editor-accent' : 'bg-editor-muted'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                autoSave ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
