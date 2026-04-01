# CunningType Feature Implementation Context Document

## 1. Project Structure

**Root Directory:** `/Users/cunningjams/git/cunningtype.com`

**Key Directory Layout:**
```
/app                    # Next.js 15 app router pages and layouts
  /api                  # Server API routes
  /leaderboard, /login, /results, /stats, /settings  # Page routes
/components             # React components
  /analytics, /auth, /charts, /navigation, /results, /settings, /stats, /time-trial, /typing-test
/lib                    # Utilities and business logic
  /db                   # Database operations (Firebase + Firestore)
  /test-engine          # Test calculations and analysis
  /benchmark-config.ts  # Benchmark test configuration
  /types.ts             # TypeScript types
/store                  # Zustand state management
  /test-store.ts, /settings-store.ts, /user-store.ts
```

## 2. Relevant Files

### Feature 1: Quick Link to Benchmark Test on WPM Display
- `/components/typing-test/WPMSpeedometer.tsx` - WPM display
- `/components/settings/SettingsToolbar.tsx` - Contains benchmark mode detection
- `/store/user-store.ts` - Stores `wpmScore`
- `/components/typing-test/hooks/useWPMStatus.ts` - WPM status & tooltip

### Feature 2: Benchmark Info Dialog
- `/components/settings/ContentOptionsModal.tsx` - Content options with benchmark tab
- `/lib/benchmark-config.ts` - Benchmark config (`duration: 120`, `label: 'benchmark'`)
- `/components/time-trial/TimeTrialLeaderboardModal.tsx` - Modal pattern reference

### Feature 3: Fix Benchmark WPM Not Updating
- `/store/test-store.ts` - `completeTest()` method, benchmark detection at line 687
- `/lib/db/users.ts` - `updateUserWPMScore()` at line 100
- `/store/user-store.ts` - `refreshUserProfile()` at line 266
- `/components/typing-test/TypingTest.tsx` - Test completion trigger

### Feature 4: Show Errors in Time Trial Results
- `/components/results/ResultsView.tsx` - Results display
- `/components/results/MistakeAnalysis.tsx` - Existing mistake analysis
- `/lib/test-engine/mistake-analysis.ts` - `analyzeMistakes()` function
- `/lib/types.ts` - `KeystrokeEvent` with `expectedChar` and `wasCorrect`

## 3. Conventions & Patterns

- **Imports:** `@/` alias always used
- **State:** Zustand stores with `create<Interface>()` pattern
- **Components:** Functional with hooks, `'use client'` directive
- **Styling:** Tailwind with `editor-*` color tokens (editor-bg, editor-fg, editor-muted, editor-accent, editor-success, editor-error)
- **Icons:** Lucide React
- **Modals:** Fixed overlay with backdrop blur, z-50, click-outside-to-close

### Modal Pattern:
```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  onClick={onClose} onKeyDown={(e) => e.stopPropagation()}>
  <div className="bg-editor-bg border border-editor-muted rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
    onClick={(e) => e.stopPropagation()}>
    {/* Header with X close button, then content */}
  </div>
</div>
```

## 4. Benchmark Test Flow (Critical for Feature 3)

```
1. TypingTest.tsx -> completeTest()
2. test-store.ts completeTest():
   - Auto-labels generated (line 562): duration, correction mode, category, practice
   - Benchmark check: allLabels.includes(BENCHMARK_CONFIG.label) (line 687)
   - If benchmark: calls updateUserWPMScore() (line 691)
   - Then: refreshUserProfile() (line 693)
3. lib/db/users.ts updateUserWPMScore():
   - Gets user profile, determines new score (first/average/reset)
   - Updates Firestore
4. user-store.ts refreshUserProfile():
   - Fetches updated profile, sets wpmScore in store
```

**Key Risk:** The benchmark label `'benchmark'` must be in `allLabels` for WPM update to trigger. Auto-labels come from category, duration, correction mode — need to verify 'benchmark' is actually added.

## 5. Dependencies
- Next.js 15.5.9, React 18.3.1, TypeScript 5.9.3
- Zustand 5.0.2, Firebase 12.4.0, Tailwind 3.4.0
- Lucide React 0.460.0, Framer Motion 11.18.2
- Date-fns 4.1.0, Recharts 3.2.1

## 6. File Dependencies Summary

| Feature | Primary Files | Secondary Files |
|---------|-------|-----------------|
| 1. Quick Benchmark Link | WPMSpeedometer.tsx, TypingTest.tsx | SettingsToolbar.tsx |
| 2. Benchmark Info Dialog | New component | benchmark-config.ts |
| 3. Fix WPM Update | test-store.ts, users.ts, user-store.ts | benchmark-config.ts, TypingTest.tsx |
| 4. Time Trial Error Display | ResultsView.tsx | mistake-analysis.ts, types.ts |
