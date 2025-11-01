# Trial History Fix - Implementation Summary

## Problem

The trial history feature was incorrectly grouping old tests together based on static `testContentId` values (e.g., 'quote-001'), even though they had different actual content:
- Different durations meant different word counts
- Different random selections from the same source text
- Result: Multiple unrelated tests were grouped together as "trials"

**Example of the bug:**
- User completes a 30s test using content from 'quote-001' → gets 50 words
- Later, user completes a 60s test using content from 'quote-001' → gets 100 words (different content!)
- Both showed up in "trial history" as if they were attempts at the same content

## Root Cause

Old tests stored static IDs in `testContentId` that referenced the source template, not the actual content. With the new system:
- `testContentId` is now a UUID pointing to a specific `testContents` record
- Each unique content gets its own UUID
- All attempts at the exact same content share the same `testContentId`

However, the trial history was still loading for any `testContentId`, including old static IDs that didn't have corresponding `testContents` records.

## Solution

Only show trial history for tests that have a valid `testContent` record in Firestore. This ensures:
1. **Consistency**: Trial history behavior matches "Try Again" button (both require testContent)
2. **Accuracy**: Only shows attempts at the exact same content
3. **Clean UX**: No confusing mixed-content trial history for old tests

## Implementation

### Changes Made

**File: `components/results/ResultsView.tsx`**

1. **Added State Variable:**
   ```typescript
   const [canShowTrialHistory, setCanShowTrialHistory] = useState(false);
   ```

2. **Updated testContent Check:**
   ```typescript
   if (testContent) {
     setCanRetry(true);
     setCanShowTrialHistory(true);  // ← New
     // ... existing targetWords logic
   } else {
     setCanRetry(false);
     setCanShowTrialHistory(false);  // ← New
   }
   ```

3. **Modified Trial History Loading:**
   ```typescript
   // Only load history if testContent exists (canShowTrialHistory)
   if (canShowTrialHistory && currentUserId && result.userId && 
       result.testContentId && !result.isPractice) {
     // ... load trial history
   } else {
     // Clear trial history if conditions not met
     setTrialHistory([]);
     setIsLoadingHistory(false);
   }
   ```

4. **Updated UI Rendering:**
   ```typescript
   {/* Only show trial history if testContent exists and we have history */}
   {canShowTrialHistory && !isLoadingHistory && trialHistory.length > 0 && (
     <div className="mb-8">
       <TrialHistory history={trialHistory} currentResult={result} />
     </div>
   )}
   ```

## Behavior After Fix

### Old Tests (without testContent)
- ✅ No trial history shown
- ✅ No "Try Again" button shown
- ✅ Consistent behavior
- ✅ No incorrect grouping

### New Tests (with testContent)
- ✅ Trial history shown for all attempts
- ✅ "Try Again" button shown
- ✅ Only groups attempts at identical content
- ✅ Accurate trial tracking

### Edge Cases
- **Practice tests**: Still filtered out (existing behavior preserved)
- **Deleted testContent**: Trial history won't show (handled by existence check)
- **Multiple tests with same source but different content**: Not grouped together ✅

## Testing Checklist

- [ ] Old test without testContent: No trial history shown
- [ ] New test with testContent: Trial history shows all attempts
- [ ] Multiple attempts at same content: All shown in trial history correctly
- [ ] Multiple attempts at different content: Not grouped together
- [ ] Practice tests: Not included in trial history
- [ ] Loading states work properly
- [ ] "Try Again" and trial history visibility are consistent

## Benefits

1. **Accuracy**: Trial history now only shows actual attempts at the same content
2. **Consistency**: Matches "Try Again" button behavior
3. **Clean UX**: No confusing data for old tests
4. **Future-proof**: Will work correctly as users create new tests
5. **Performance**: Doesn't fetch trial history for tests without testContent

## Migration Path

No migration needed! The fix gracefully handles:
- Old tests: Simply don't show trial history (no breaking changes)
- New tests: Work perfectly with the new system
- Users won't notice any disruption, just cleaner data

## Related Files

- `components/results/ResultsView.tsx` - Main implementation
- `components/results/TrialHistory.tsx` - Display component (no changes needed)
- `lib/db/firebase.ts` - `getTestResultsByContent()` function (no changes needed)

