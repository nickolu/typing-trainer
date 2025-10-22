'use client';

import { useState } from 'react';
import { X, ShieldOff } from 'lucide-react';
import { CorrectionMode } from '@/store/settings-store';

interface CorrectionModeSelectorProps {
  selectedMode: CorrectionMode;
  onModeChange: (mode: CorrectionMode) => void;
  disabled?: boolean;
  mistakeThreshold?: number;
  onThresholdChange?: (threshold: number) => void;
}

const modeOptions: { value: CorrectionMode; label: string; description: string }[] = [
  { value: 'normal', label: 'Normal', description: 'Backspace allowed' },
  { value: 'speed', label: 'Speed', description: 'No corrections - skip mistakes' },
  { value: 'strict', label: 'Strict', description: 'Block incorrect input' },
];

export function CorrectionModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
  mistakeThreshold,
  onThresholdChange
}: CorrectionModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempThreshold, setTempThreshold] = useState<string>(
    mistakeThreshold === Infinity ? '' : String(mistakeThreshold)
  );

  const handleSelectMode = (mode: CorrectionMode) => {
    onModeChange(mode);
    setIsOpen(false);
  };

  const handleThresholdChange = (value: string) => {
    setTempThreshold(value);
    if (onThresholdChange) {
      const numValue = value === '' ? Infinity : parseInt(value, 10);
      if (!isNaN(numValue) && numValue > 0) {
        onThresholdChange(numValue);
      }
    }
  };

  const getSelectedLabel = () => {
    const option = modeOptions.find(opt => opt.value === selectedMode);
    return option?.label || 'Normal';
  };

  const getModeColor = () => {
    switch (selectedMode) {
      case 'speed':
        return 'text-orange-400';
      case 'strict':
        return 'text-red-400';
      default:
        return 'text-editor-muted';
    }
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-editor-muted/30 text-editor-fg border border-editor-muted hover:bg-editor-muted/50 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <ShieldOff className={`w-4 h-4 ${getModeColor()}`} />
        <span className="text-sm">
          {getSelectedLabel()}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-editor-bg border border-editor-muted rounded-lg shadow-xl z-20">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">Correction Mode</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-editor-muted/30 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Options */}
              <div className="space-y-1 mb-4">
                {modeOptions.map(option => {
                  const isSelected = selectedMode === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelectMode(option.value)}
                      className={`w-full text-left px-3 py-3 rounded transition-colors ${
                        isSelected
                          ? 'bg-editor-accent/20 text-editor-accent border border-editor-accent/50'
                          : 'hover:bg-editor-muted/30 text-editor-fg border border-transparent'
                      }`}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className={`text-xs mt-0.5 ${
                        isSelected ? 'text-editor-accent/70' : 'text-editor-muted'
                      }`}>
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Strict Mode Settings */}
              {selectedMode === 'strict' && (
                <div className="border-t border-editor-muted pt-3">
                  <label className="block text-sm font-medium mb-2">
                    Mistake Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Infinity"
                    value={tempThreshold}
                    onChange={(e) => handleThresholdChange(e.target.value)}
                    className="w-full px-3 py-2 bg-editor-bg border border-editor-muted rounded text-sm focus:outline-none focus:border-editor-accent"
                  />
                  <p className="text-xs text-editor-muted mt-1">
                    Test ends after this many mistakes. Leave empty for unlimited.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
