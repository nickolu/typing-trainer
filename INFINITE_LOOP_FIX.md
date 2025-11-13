# Infinite Loop Fix

## Issue
After completing a typing test and viewing results, clicking "New Test" caused the page to crash with an infinite render loop or memory leak.

## Root Cause
The issue was in `components/typing-test/TypingTest.tsx` where `useEffect` hooks had `targetWords` (an array) in their dependency arrays.

### Why This Caused an Infinite Loop

1. Arrays in React are compared by reference, not by value
2. When `initializeTest()` is called, it creates a **new array reference** for `targetWords`, even if the content is the same
3. This new reference triggers any `useEffect` that has `targetWords` in its dependency array
4. Some of these effects would call `initializeTest()` again under certain conditions
5. This creates a new `targetWords` array → triggers effect → calls `initializeTest()` → infinite loop

### Specific Problematic Flow

```
User clicks "New Test" in ResultsView
  → handleNewTest() calls initializeTest()
  → New targetWords array created
  → Router navigates to "/"
  → TypingTest component renders
  → useEffect (line 641-673) runs because targetWords changed
  → Checks: status === 'idle' && targetWords.length > 0 && duration !== defaultDuration
  → If duration mismatch, calls initializeTest() again
  → Creates new targetWords array
  → Effect triggers again
  → INFINITE LOOP
```

## Solution

Instead of including `targetWords` (the array) in dependency arrays, we now use `targetWordsLength` (a primitive number):

```typescript
// Extract the length as a stable primitive value
const targetWordsLength = targetWords.length;

// Use the length in dependency arrays instead of the array itself
useEffect(() => {
  // ... effect logic
}, [status, targetWordsLength, /* other deps */]); // ✅ No array reference
```

### Changes Made

1. **Line 492**: Declared `targetWordsLength` constant
2. **Line 512**: Changed `targetWords.length === 0` to `targetWordsLength === 0`
3. **Line 641**: Updated dependency array to use `targetWordsLength` instead of `targetWords`
4. **Line 651**: Changed `targetWords.length > 0` to `targetWordsLength > 0`
5. **Line 669**: Changed `targetWords` to `currentState.targetWords` when calling `initializeTest()`
6. **Line 673**: Updated dependency array to use `targetWordsLength` instead of `targetWords`
7. **Line 714**: Changed `targetWords.length` to `targetWordsLength`
8. **Line 717**: Updated dependency array to use `targetWordsLength` instead of `targetWords.length`

### Why One Effect Still Uses `targetWords`

The effect on line 728-746 still uses `targetWords` in its dependency array because:
- It only runs when `status === 'active'`
- During an active test, `targetWords` never changes
- The effect needs the actual array values to calculate live WPM
- No risk of infinite loop since the effect doesn't call `initializeTest()`

## Testing

- ✅ Build succeeds without errors
- ✅ No TypeScript or linter errors
- ✅ The fix prevents array reference changes from triggering unnecessary effect re-runs

## Related Issue

Clearing localStorage fixed the issue temporarily because it reset persisted settings that might have had duration mismatches or other state that triggered the problematic effect conditions.

## Prevention

To prevent similar issues in the future:
1. Avoid putting arrays/objects in `useEffect` dependency arrays when possible
2. Use primitive values (length, id, etc.) instead
3. When you must use an array/object, ensure the effect doesn't create new instances of that same array/object
4. Consider using `useMemo` or `useRef` for stable references when needed

