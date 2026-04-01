# General Review — Benchmark Improvements

## Verdict: APPROVE WITH CHANGES

## Critical Issues
1. **[CRITICAL]** Feature 3: Moving benchmark WPM update outside shouldSave must guard on `currentUserId` being non-null — unauthenticated users would crash
2. **[HIGH]** Feature 3: Visually flipping autoSave is a UX antipattern — silently overrides user preference. Better to bypass shouldSave internally for benchmarks without mutating the store
3. **[HIGH]** Feature 3: Pre-test cooldown warning already exists as tooltip in useWPMStatus — plan needs to specify what additional UI is needed

## Medium Issues
4. Feature 1: Must call resetTest() before navigation if a test is active
5. Feature 3: updateUserWPMScore return type change — call site must be updated
6. Feature 4: Strict mode keystroke deduplication — same (wordIndex, charIndex) can have multiple keystrokes

## Low Issues
7. Feature 2: Dialog content should mention reset date extends with each benchmark
8. Feature 1: LogoutButton may not render for unauthenticated users — verify render condition
9. Feature 4: Time trial results may have correction-mode-normal label despite forcing strict — guard should check isTimeTrial OR correction-mode-strict
