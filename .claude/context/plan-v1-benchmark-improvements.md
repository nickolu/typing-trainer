# Implementation Plan

## Goal
Implement four features for CunningType: (1) quick benchmark link near WPM display, (2) benchmark info dialog, (3) fix benchmark WPM not updating, (4) error highlighting in time trial results.

## Feature 1: Quick Link to Benchmark Test on WPM Display

### Approach
Add a clickable element near the WPM score shown in `LogoutButton.tsx`. Authenticated users get taken to benchmark test; unauthenticated users get taken to sign-up page with messaging like "Sign up to track your WPM."

### Files to Modify
- `/components/auth/LogoutButton.tsx` — Add benchmark link/icon next to WPM display

### Steps (PARALLEL with Features 2, 4)
1. Import `useSettingsStore` and `useRouter`
2. Add clickable element next to WPM score — "Take Benchmark" if no score, small icon if score exists
3. On click (authenticated): `setDefaultContentStyle('benchmark')` and `router.push('/')`
4. On click (unauthenticated): `router.push('/login')` with messaging about tracking WPM

## Feature 2: Benchmark Info Dialog

### Approach
New modal component following TimeTrialLeaderboardModal pattern. Triggered from info icon next to benchmark link.

### New Files
- `/components/benchmark/BenchmarkInfoDialog.tsx`

### Files to Modify
- `/components/auth/LogoutButton.tsx` — Add info icon that opens dialog

### Steps (PARALLEL with Features 1, 4)
1. Create BenchmarkInfoDialog with established modal pattern
2. Content: 120s test, first test = direct score, 30+ days = averaged, <30 days = no change, 6-month reset
3. Add state and render in LogoutButton

## Feature 3: Fix Benchmark WPM Not Updating

### Root Cause Analysis
Two likely failure modes:
- **Mode A:** `shouldSave` check at line 667 gates the benchmark WPM update. If autoSave is off, benchmark score never updates.
- **Mode B:** 30-day cooldown in `updateUserWPMScore` (line 146-148) returns existing score silently with no user feedback.

### Files to Modify
- `/store/test-store.ts` — Move benchmark WPM update outside `if (shouldSave)` block, or force shouldSave for benchmarks
- `/lib/db/users.ts` — Return `{ newScore, updated, reason }` for better feedback

### Steps (SEQUENTIAL — verify root cause first)
1. Move benchmark WPM update outside `if (shouldSave)` block — benchmark score should update regardless
2. Force benchmark tests to always save their result too
3. When benchmark starts, visually flip autoSave on with tooltip: "Benchmark tests require save to be enabled"
4. Update `updateUserWPMScore` return type for better feedback
5. Show cooldown status BEFORE benchmark test (in tooltip/dialog) AND AFTER completion (in results)
6. Log result for debugging

## Feature 4: Show Error Highlighting in Strict Mode / Time Trial Results

### Approach
Simple highlight on mistyped characters in the results text display. Only applies to strict mode (which includes time trials) since other modes already show errors inline during typing. Render the original target text with error characters highlighted in red.

### New Files
- `/components/results/ErrorHighlight.tsx`

### Files to Modify
- `/components/results/ResultsView.tsx` — Add ErrorHighlight component for strict mode results

### Steps (PARALLEL with Features 1, 2)
1. Create ErrorHighlight component — renders target text, uses keystrokeTimings to identify which characters were incorrect, highlights those in red (editor-error)
2. Props: `targetWords: string[]`, `keystrokeTimings: KeystrokeEvent[]`
3. Render in ResultsView, conditionally shown only for strict mode results
4. Use useMemo for performance

## Resolved Questions

1. Benchmark link: authenticated → benchmark test, unauthenticated → sign up page
2. Benchmark auto-save: visually flip toggle on with tooltip "Benchmark tests require save to be enabled"
3. Cooldown: show before AND after benchmark test
4. Error highlighting: strict mode only (includes time trials), not other modes
5. Error map: simple character highlighting on original text, no word-by-word comparison or collapsing
