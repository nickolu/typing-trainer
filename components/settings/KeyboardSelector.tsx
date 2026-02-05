'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useUserStore } from '@/store/user-store';
import { getUserLabels, addUserLabel, deleteUserLabel } from '@/lib/db';

interface KeyboardSelectorProps {
  selectedKeyboard: string | null; // Full label with "keyboard-" prefix, or null
  onKeyboardChange: (keyboard: string | null) => void;
  disabled?: boolean;
}

export function KeyboardSelector({ selectedKeyboard, onKeyboardChange, disabled = false }: KeyboardSelectorProps) {
  const { currentUserId, isAuthenticated } = useUserStore();
  const [availableKeyboards, setAvailableKeyboards] = useState<string[]>([]);
  const [newKeyboard, setNewKeyboard] = useState('');
  const [isAddingKeyboard, setIsAddingKeyboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Load keyboards (labels starting with "keyboard-")
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      loadKeyboards();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUserId]);

  const loadKeyboards = async () => {
    if (!currentUserId) return;

    setIsLoading(true);
    try {
      const labels = await getUserLabels(currentUserId);
      // Filter to only show keyboards (labels starting with "keyboard-")
      const keyboards = labels.filter(l => l.startsWith('keyboard-'));
      setAvailableKeyboards(keyboards);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load keyboards:', error);
      if (error?.code === 'permission-denied') {
        setError('Permission denied. Please check Firestore rules.');
      }
      setAvailableKeyboards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectKeyboard = (keyboard: string | null) => {
    onKeyboardChange(keyboard);

    // Show saved feedback
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleAddKeyboard = async () => {
    if (!currentUserId || !newKeyboard.trim()) return;

    const trimmedName = newKeyboard.trim();

    // Validate keyboard name (will have "keyboard-" prefix added)
    if (trimmedName.length < 2) {
      setError('Keyboard name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Keyboard name must be 30 characters or less');
      return;
    }

    // Create full label with "keyboard-" prefix
    const fullLabel = `keyboard-${trimmedName}`;

    setIsAddingKeyboard(true);
    setError(null);

    try {
      const success = await addUserLabel(currentUserId, fullLabel);
      if (success) {
        await loadKeyboards();
        setNewKeyboard('');
        // Auto-select the newly added keyboard
        onKeyboardChange(fullLabel);

        // Show saved feedback
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      } else {
        setError('Keyboard already exists');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to add keyboard');
    } finally {
      setIsAddingKeyboard(false);
    }
  };

  const handleDeleteKeyboard = async (keyboard: string) => {
    if (!currentUserId) return;

    try {
      await deleteUserLabel(currentUserId, keyboard);
      await loadKeyboards();
      // Clear selection if the deleted keyboard was selected
      if (selectedKeyboard === keyboard) {
        onKeyboardChange(null);
      }
    } catch (error) {
      console.error('Failed to delete keyboard:', error);
      setError('Failed to delete keyboard');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-editor-muted/10 border border-editor-muted/30 rounded text-sm text-editor-muted text-center">
        Sign in to manage keyboards
      </div>
    );
  }

  return (
    <div className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Saved Feedback */}
      {showSaved && (
        <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400 flex items-center gap-2">
          <span className="text-base">✓</span>
          <span>Saved!</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Keyboard Selection */}
      <div className="mb-3">
        {isLoading ? (
          <div className="py-4 text-center text-sm text-editor-muted">
            Loading keyboards...
          </div>
        ) : (
          <div className="space-y-2">
            {/* None Option */}
            <div
              onClick={() => handleSelectKeyboard(null)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedKeyboard === null
                  ? 'bg-editor-accent/20 text-editor-accent border-editor-accent/50'
                  : 'bg-editor-bg hover:bg-editor-muted/30 text-editor-fg border-editor-muted/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedKeyboard === null
                    ? 'border-editor-accent'
                    : 'border-editor-muted'
                }`}>
                  {selectedKeyboard === null && (
                    <div className="w-2 h-2 rounded-full bg-editor-accent" />
                  )}
                </div>
                <span className="font-medium">None</span>
              </div>
            </div>

            {/* Available Keyboards */}
            {availableKeyboards.map(keyboard => {
              const displayName = keyboard.replace('keyboard-', '');
              const isSelected = selectedKeyboard === keyboard;

              return (
                <div
                  key={keyboard}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'bg-editor-accent/20 text-editor-accent border-editor-accent/50'
                      : 'bg-editor-bg hover:bg-editor-muted/30 text-editor-fg border-editor-muted/30'
                  }`}
                >
                  <div
                    onClick={() => handleSelectKeyboard(keyboard)}
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-editor-accent'
                        : 'border-editor-muted'
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-editor-accent" />
                      )}
                    </div>
                    <span className="font-medium">{displayName}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteKeyboard(keyboard);
                    }}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete keyboard"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {availableKeyboards.length === 0 && (
              <div className="py-4 text-center text-sm text-editor-muted">
                No keyboards yet. Add one below!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add New Keyboard */}
      <div className="pt-3 border-t border-editor-muted/30">
        <div className="text-xs text-editor-muted mb-2">
          Add New Keyboard
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyboard}
            onChange={(e) => {
              setNewKeyboard(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddKeyboard();
              }
            }}
            placeholder="Enter keyboard name..."
            maxLength={30}
            className="flex-1 px-3 py-2 bg-editor-muted/20 border border-editor-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
            disabled={isAddingKeyboard}
          />
          <button
            onClick={handleAddKeyboard}
            disabled={isAddingKeyboard || !newKeyboard.trim()}
            className="px-4 py-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
