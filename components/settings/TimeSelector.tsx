'use client';

import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { TestDuration } from '@/store/settings-store';

interface TimeSelectorProps {
  selectedDuration: TestDuration;
  onDurationChange: (duration: TestDuration) => void;
  disabled?: boolean;
}

const durationOptions: { value: TestDuration; label: string; description: string }[] = [
  { value: 15, label: '15 seconds', description: 'Quick sprint' },
  { value: 30, label: '30 seconds', description: 'Short practice' },
  { value: 60, label: '60 seconds', description: 'Standard test' },
  { value: 120, label: '2 minutes', description: 'Extended session' },
  { value: 'content-length', label: 'Content Length', description: 'Until content ends' },
];

export function TimeSelector({ selectedDuration, onDurationChange, disabled = false }: TimeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectDuration = (duration: TestDuration) => {
    onDurationChange(duration);
    setIsOpen(false);
  };

  const getSelectedLabel = () => {
    const option = durationOptions.find(opt => opt.value === selectedDuration);
    return option?.label || '60 seconds';
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
        <Clock className="w-4 h-4 text-editor-accent" />
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
          <div className="absolute top-full left-0 mt-2 w-72 bg-editor-bg border border-editor-muted rounded-lg shadow-xl z-20">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">Select Test Duration</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-editor-muted/30 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Duration Options */}
              <div className="space-y-1">
                {durationOptions.map(option => {
                  const isSelected = selectedDuration === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelectDuration(option.value)}
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
