# Final Implementation Plan

## Summary

Four targeted improvements to the benchmark and results system: (1) clickable WPM badge linking to benchmark, (2) benchmark info dialog, (3) fix benchmark WPM not updating when autoSave is off, (4) error highlighting in strict mode/time trial results.

## Changes from Original Plan

- **Feature 1**: Add benchmark link at the TypingTest.tsx level, not inside LogoutButton — avoids scope creep. Call resetTest() before navigating if test is active.
- **Feature 3**: Do NOT mutate autoSave store. Instead, compute `shouldSave = autoSave || (isBenchmark && isAuthenticated)` at the call site in TypingTest.tsx. One-line fix.
- **Feature 4**: Use typedWords vs targetWords diffing instead of parsing keystrokeTimings — simpler and avoids backspace deduplication complexity.
- **Dropped**: No UserStatusBar extraction, no typed enum return for updateUserWPMScore, no post-completion hook pattern. Out of scope.

## Execution Tasks

### Task 1: Quick Benchmark Link on WPM Display
- **Complexity**: small
- **Parallelizable**: yes
- **Files**: `/components/typing-test/TypingTest.tsx`
- **Instructions**:
  - Locate WPM score display area (line ~1030)
  - Add clickable benchmark link next to LogoutButton for auth users
  - If test active, call resetTest() first, then navigate to benchmark
  - For unauth users (line ~1043), add "Take Benchmark" text linking to /login
  - Use text-editor-accent for link color
  - Import Link from next/link (already imported)

### Task 2: Benchmark Info Dialog
- **Complexity**: small
- **Parallelizable**: yes
- **Files**: `/components/benchmark/BenchmarkInfoDialog.tsx` (new), integration in TypingTest.tsx near Task 1's link
- **Instructions**:
  - Create modal following TimeTrialLeaderboardModal pattern
  - Fixed overlay, bg-black/50 backdrop-blur-sm, z-50, click-outside-to-close
  - onKeyDown stopPropagation to prevent typing test interference
  - Use bg-editor-bg for modal background
  - Content: 2-min test, first sets score directly, 30+ days averages, <30 days no change, 6-month reset (extends with each benchmark)
  - Accept wpmStatus prop (don't re-fetch), isOpen, onClose
  - Trigger: info icon (HelpCircle) next to benchmark link from Task 1

### Task 3: Fix Benchmark WPM Not Updating
- **Complexity**: small
- **Parallelizable**: yes
- **Files**: `/components/typing-test/TypingTest.tsx`
- **Instructions**:
  - In handleComplete (~line 865), change from `completeTest(autoSave)` to:
    ```typescript
    const isBenchmark = defaultContentStyle === 'benchmark';
    const shouldSave = autoSave || (isBenchmark && isAuthenticated);
    const result = await completeTest(shouldSave);
    ```
  - Update navigation condition (line ~870) from `if (result && autoSave)` to `if (result && shouldSave)`
  - This ensures benchmark results always save for auth users without mutating autoSave

### Task 4: Error Highlighting in Strict/Time Trial Results
- **Complexity**: medium
- **Parallelizable**: yes
- **Files**: `/components/results/ErrorHighlight.tsx` (new), `/components/results/ResultsView.tsx`
- **Instructions**:
  - Create ErrorHighlight.tsx with props: targetWords: string[], typedWords: string[]
  - Diff words character-by-character: correct=text-editor-fg, incorrect=text-editor-error with bg-editor-error/20, missing=text-editor-muted with underline
  - Scrollable container, monospace font, words separated by spaces
  - In ResultsView.tsx, render after "Detailed Statistics" and before "Sequence Analysis"
  - Only show when: `result.isTimeTrial || result.labels?.includes('correction-mode-strict')`
  - targetWords already available (line 86-88), typedWords on result object
  - Use useMemo for the diff computation

## Merge Order

All 4 tasks are independent and can develop in parallel. Merge order:
1. Task 3 (bug fix, smallest, highest value)
2. Task 1 (UI addition)
3. Task 2 (new component, integrates near Task 1)
4. Task 4 (new component)

## Validation

- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Test**: `npm test` (vitest)
- **Manual**:
  - Task 1: Verify link appears for auth/unauth, resets active test
  - Task 2: Verify dialog opens/closes, no key leaks, content accurate
  - Task 3: Set autoSave OFF, run benchmark, verify WPM updates. Verify unauth doesn't crash. Verify non-benchmark respects autoSave=OFF.
  - Task 4: Run strict/time-trial test with errors, verify red highlights. Run normal test, verify no highlights.

## PR Description Template

**Title**: Add benchmark improvements and strict mode error highlighting

**Body**:
## Summary
- Add quick benchmark link on WPM display (auth -> benchmark, unauth -> sign up)
- Add benchmark info dialog explaining scoring rules and cooldown periods
- Fix benchmark WPM not updating when autoSave is disabled
- Add error highlighting in strict mode and time trial results

## Test plan
- [ ] Auth user: WPM badge links to benchmark; resets active test before navigating
- [ ] Unauth user: sees sign-up prompt instead of benchmark link
- [ ] Benchmark info dialog opens/closes correctly, no key leaks to typing test
- [ ] Benchmark test saves and updates WPM even with autoSave OFF
- [ ] Unauthenticated benchmark test completes without crash
- [ ] Non-benchmark tests still respect autoSave=OFF setting
- [ ] Strict mode results show error highlighting with red mistyped characters
- [ ] Time trial results show error highlighting
- [ ] Normal mode results do NOT show error highlighting
