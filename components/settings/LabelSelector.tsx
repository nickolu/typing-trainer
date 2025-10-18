'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Tag, Trash2 } from 'lucide-react';
import { useUserStore } from '@/store/user-store';
import { getUserLabels, addUserLabel, deleteUserLabel } from '@/lib/db/firebase';

interface LabelSelectorProps {
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
  disabled?: boolean;
}

export function LabelSelector({ selectedLabels, onLabelsChange, disabled = false }: LabelSelectorProps) {
  const { currentUserId, isAuthenticated } = useUserStore();
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  // Load user labels
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      loadLabels();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUserId]);

  const loadLabels = async () => {
    if (!currentUserId) return;

    setIsLoading(true);
    try {
      const labels = await getUserLabels(currentUserId);
      setAvailableLabels(labels);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load labels:', error);
      // Only show permission errors to authenticated users
      if (error?.code === 'permission-denied') {
        setError('Permission denied. Please check Firestore rules.');
      }
      setAvailableLabels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLabel = (label: string) => {
    if (selectedLabels.includes(label)) {
      onLabelsChange(selectedLabels.filter(l => l !== label));
    } else {
      onLabelsChange([...selectedLabels, label]);
    }
  };

  const handleAddLabel = async () => {
    if (!currentUserId || !newLabel.trim()) return;

    const trimmedLabel = newLabel.trim();

    // Validate label
    if (trimmedLabel.length < 2) {
      setError('Label must be at least 2 characters');
      return;
    }

    if (trimmedLabel.length > 30) {
      setError('Label must be 30 characters or less');
      return;
    }

    setIsAddingLabel(true);
    setError(null);

    try {
      const success = await addUserLabel(currentUserId, trimmedLabel);
      if (success) {
        await loadLabels();
        setNewLabel('');
        // Auto-select the newly added label
        onLabelsChange([...selectedLabels, trimmedLabel]);
      } else {
        setError('Label already exists');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to add label');
    } finally {
      setIsAddingLabel(false);
    }
  };

  const handleDeleteLabel = async (label: string) => {
    if (!currentUserId) return;

    try {
      await deleteUserLabel(currentUserId, label);
      await loadLabels();
      // Remove from selected labels if it was selected
      if (selectedLabels.includes(label)) {
        onLabelsChange(selectedLabels.filter(l => l !== label));
      }
    } catch (error) {
      console.error('Failed to delete label:', error);
      setError('Failed to delete label');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          selectedLabels.length > 0
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Tag className="w-4 h-4" />
        <span className="text-sm">
          {selectedLabels.length > 0 ? `${selectedLabels.length} Label${selectedLabels.length > 1 ? 's' : ''}` : 'Add Labels'}
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
                <h3 className="text-sm font-bold">Select Labels</h3>
                <div className="flex items-center gap-2">
                  {availableLabels.length > 0 && (
                    <button
                      onClick={() => setDeleteMode(!deleteMode)}
                      className={`p-1 rounded transition-colors ${
                        deleteMode ? 'bg-red-500/20 text-red-400' : 'hover:bg-editor-muted/30 text-editor-muted'
                      }`}
                      title={deleteMode ? 'Done deleting' : 'Delete labels'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-editor-muted/30 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Selected Labels Display */}
              {selectedLabels.length > 0 && (
                <div className="mb-3 pb-3 border-b border-editor-muted">
                  <div className="text-xs text-editor-muted mb-2">Selected:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedLabels.map(label => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-medium"
                      >
                        {label}
                        <button
                          onClick={() => handleToggleLabel(label)}
                          className="hover:bg-blue-600/30 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                  {error}
                </div>
              )}

              {/* Available Labels */}
              {isLoading ? (
                <div className="py-4 text-center text-sm text-editor-muted">
                  Loading labels...
                </div>
              ) : availableLabels.length > 0 ? (
                <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                  {availableLabels.map(label => {
                    const isSelected = selectedLabels.includes(label);
                    return (
                      <div
                        key={label}
                        className="flex items-center justify-between group"
                      >
                        <button
                          onClick={() => !deleteMode && handleToggleLabel(label)}
                          disabled={deleteMode}
                          className={`flex-1 text-left px-3 py-2 rounded text-sm transition-colors ${
                            isSelected
                              ? 'bg-blue-600/10 text-blue-400 font-medium'
                              : 'hover:bg-editor-muted/30 text-editor-fg'
                          } ${deleteMode ? 'opacity-50' : ''}`}
                        >
                          {label}
                        </button>
                        {deleteMode && (
                          <button
                            onClick={() => handleDeleteLabel(label)}
                            className="ml-2 p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            title="Delete label"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-editor-muted mb-3">
                  No labels yet. Add one below!
                </div>
              )}

              {/* Add New Label */}
              {availableLabels.length < 20 ? (
                <div className="pt-3 border-t border-editor-muted">
                  <div className="text-xs text-editor-muted mb-2">
                    Add New Label ({availableLabels.length}/20)
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => {
                        setNewLabel(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => {
                        // Stop event propagation to prevent typing test from starting
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLabel();
                        }
                      }}
                      placeholder="Enter label name"
                      maxLength={30}
                      className="flex-1 px-3 py-2 bg-editor-muted/20 border border-editor-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isAddingLabel}
                    />
                    <button
                      onClick={handleAddLabel}
                      disabled={isAddingLabel || !newLabel.trim()}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  {error && (
                    <div className="mt-2 text-xs text-red-400">
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-3 border-t border-editor-muted">
                  <div className="text-xs text-orange-400 text-center">
                    Maximum of 20 labels reached. Delete some to add more.
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
