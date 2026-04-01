# Frontend Review — Benchmark Improvements

## Verdict: APPROVE WITH CHANGES

## Key Issues
1. **[HIGH]** Feature 3: Force-flipping autoSave toggle is an antipattern. Fix should bypass shouldSave internally for benchmarks, not mutate user settings. Optionally disable the toggle when benchmark mode active.
2. **[MEDIUM]** Feature 4: For strict mode, prefer diffing typedWords vs targetWords directly instead of parsing keystrokeTimings — simpler and avoids backspace-filtering complexity
3. **[MEDIUM]** Feature 1: LogoutButton should stay presentational — pass benchmarkHref as prop rather than importing useSettingsStore

## Recommendations
- Feature 1: Make WPM score a clickable `<a>` or `<button>` with proper aria-label and focus indicator
- Feature 2: Use bg-editor-bg with border-editor-muted (not bg-gray-900). Must replicate onKeyDown stopPropagation pattern. Accept wpmStatus as prop, don't re-fetch.
- Feature 3: Move benchmark WPM update before shouldSave block with `if (isBenchmarkTest && currentUserId)` guard
- Feature 4: Use conditional rendering `{open && <Dialog />}` at call site rather than `if (!isOpen) return null` inside component
- Feature 4: Guard condition should be `result.isTimeTrial || labels includes correction-mode-strict` since time trials may not have strict label

## Performance Notes
- ErrorHighlight with typedWords diff is O(n) on characters — efficient
- BenchmarkInfoDialog should use conditional mount to avoid hook initialization cost
- Pass pre-fetched wpmStatus data to dialog instead of independent fetch
