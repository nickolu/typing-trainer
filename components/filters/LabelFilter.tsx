'use client';

import { useMemo, useState } from 'react';
import { Tag, X } from 'lucide-react';
import { TestResult } from '@/lib/types';

export type LabelMatchMode = 'any' | 'all';

interface LabelFilterProps {
  /**
   * Results to derive the available labels and their counts from. Pass the list with every
   * filter EXCEPT the label filter applied, so counts reflect what selecting a chip will yield.
   */
  results: TestResult[];
  selected: string[];
  onChange: (labels: string[]) => void;
  matchMode: LabelMatchMode;
  onMatchModeChange: (mode: LabelMatchMode) => void;
  /** How many labels to show before the "more" toggle. */
  visibleCount?: number;
  /**
   * Labels starting with any of these prefixes sort ahead of the rest (still by count within
   * the group). Use it to keep the labels a page is about from hiding behind "more".
   */
  pinnedPrefixes?: string[];
}

/** True when at least one result carries a label. */
export function hasAnyLabels(results: TestResult[]): boolean {
  return results.some((r) => (r.labels?.length ?? 0) > 0);
}

/** Apply a label selection to a result list. */
export function filterByLabels(results: TestResult[], selected: string[], mode: LabelMatchMode): TestResult[] {
  if (selected.length === 0) return results;
  return results.filter((r) => {
    const labels = r.labels ?? [];
    if (labels.length === 0) return false;
    return mode === 'all'
      ? selected.every((l) => labels.includes(l))
      : selected.some((l) => labels.includes(l));
  });
}

export function LabelFilter({
  results,
  selected,
  onChange,
  matchMode,
  onMatchModeChange,
  visibleCount = 6,
  pinnedPrefixes = [],
}: LabelFilterProps) {
  const [expanded, setExpanded] = useState(false);

  const sortedLabels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of results) {
      for (const label of r.labels ?? []) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
    // A selected label with no matches in the current results still gets a chip (count 0),
    // otherwise there would be no way to deselect it.
    for (const label of selected) {
      if (!counts.has(label)) counts.set(label, 0);
    }
    const isPinned = (label: string) => pinnedPrefixes.some((p) => label.startsWith(p));
    return Array.from(counts.entries())
      .sort((a, b) => {
        const pin = Number(isPinned(b[0])) - Number(isPinned(a[0]));
        return pin || b[1] - a[1] || a[0].localeCompare(b[0]);
      })
      .map(([label, count]) => ({ label, count }));
  }, [results, selected, pinnedPrefixes]);

  if (sortedLabels.length === 0) return null;

  const toggle = (label: string) =>
    onChange(selected.includes(label) ? selected.filter((l) => l !== label) : [...selected, label]);

  const isHidden = (label: string, index: number) =>
    !expanded && index >= visibleCount && !selected.includes(label);
  const hiddenCount = sortedLabels.filter(({ label }, i) => isHidden(label, i)).length;
  const collapsible = sortedLabels.some(({ label }, i) => i >= visibleCount && !selected.includes(label));

  return (
    <div className="flex items-start gap-4">
      <div className="flex items-center gap-2 text-editor-muted font-medium pt-0.5 whitespace-nowrap">
        <Tag className="w-4 h-4" />
        <span>Labels:</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2">
          {sortedLabels.map(({ label, count }, index) => {
            if (isHidden(label, index)) return null;
            const active = selected.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggle(label)}
                aria-pressed={active}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  active
                    ? 'bg-editor-accent text-white'
                    : 'bg-editor-muted/30 text-editor-fg hover:bg-editor-muted/50'
                }`}
              >
                <Tag className="w-3 h-3" />
                {label}
                <span className="text-xs opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-editor-muted hover:text-editor-fg transition-colors"
            >
              {expanded ? 'less' : `more (${hiddenCount})`}
            </button>
          )}
          {selected.length > 1 && (
            <div className="flex items-center gap-1 text-editor-muted">
              <span>match</span>
              {(['any', 'all'] as LabelMatchMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onMatchModeChange(mode)}
                  aria-pressed={matchMode === mode}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    matchMode === mode
                      ? 'bg-editor-accent text-white'
                      : 'bg-editor-muted/30 text-editor-muted hover:bg-editor-muted/50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-editor-muted hover:text-editor-fg transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
