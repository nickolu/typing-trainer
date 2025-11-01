# Test Retry Bug Fix - Implementation Summary

## Overview
Fixed the "Try Again" button bug and implemented a proper test content management system using Firestore.

## Problem
- "Try Again" button didn't retry the same test content
- Test content was stored in memory/localStorage, causing issues
- No reliable way to track multiple attempts of the same content
- Trial history wasn't properly linked across multiple attempts

## Solution
Created a `testContents` collection in Firestore to store test text and words separately from test results. Each test result now references a testContent record, enabling proper retry functionality and trial history tracking.

## Changes Made

### 1. Database Schema (`lib/types.ts`)
- **Added** `StoredTestContent` interface:
  - `id`: UUID
  - `userId`: Owner
  - `text`: Original text
  - `words`: Parsed words array
  - `createdAt`: Date
  - `sourceId`: Optional reference to static test ID
  - `contentHash`: Hash for deduplication

- **Modified** `TestResult` interface:
  - `targetWords` marked as optional (deprecated, kept for backward compatibility)
  - Comments clarified that `testContentId` now points to testContents collection

- **Modified** `StoredTestConfig` interface:
  - Removed `targetWords` field (fetched from testContents instead)

- **Modified** `TestState` interface:
  - Updated `retryLastTest` signature to return `Promise<string[] | null>`

### 2. Firebase Functions (`lib/db/firebase.ts`)
- **Added** `TEST_CONTENTS_COLLECTION` constant
- **Added** `generateContentHash()` helper function
- **Added** `saveTestContent()` - Saves test content to Firestore
- **Added** `getTestContent()` - Fetches test content by ID
- **Added** `findTestContentBySource()` - Finds existing content by sourceId
- **Added** `findTestContentByHash()` - Finds existing content by contentHash
- **Modified** aggregate functions to handle optional `targetWords`:
  - `getAggregateSlowSequences()`
  - `getAggregateSequenceTimings()`
  - `getAggregateMistakes()`

### 3. Test Store (`store/test-store.ts`)
- **Modified** `initializeTest()` - Removed `targetWords` from `lastTestConfig`
- **Modified** `retryLastTest()`:
  - Now async function
  - Fetches testContent from Firestore
  - Returns words array or null
- **Modified** `completeTest()` - No longer saves `targetWords` in test results

### 4. TypingTest Component (`components/typing-test/TypingTest.tsx`)
- **Added** `saveOrReuseTestContent()` helper function:
  - Checks for existing testContent by sourceId (static tests) or contentHash (AI tests)
  - Reuses existing testContent to maintain trial history
  - Creates new testContent only if truly unique
- **Modified** `handleContentLoad()` - Saves testContent before initializing tests
- **Modified** mount initialization effect - Async test content creation
- All test initialization paths now save/reuse testContent properly

### 5. Results View (`components/results/ResultsView.tsx`)
- **Added** `canRetry` state - Tracks if test content is available for retry
- **Added** `isCheckingRetry` state - Loading state for content check
- **Added** `targetWords` state - Fetched from testContent if not in result
- **Added** effect to check testContent availability and fetch targetWords
- **Modified** `handleTryAgain()` - Now async with error handling
- **Modified** "Try Again" button - Only shown if testContent exists
- **Modified** sequence timing calculations - Use local `targetWords` state

### 6. Component Updates
**MistakeAnalysis** (`components/results/MistakeAnalysis.tsx`):
- **Added** `targetWords` prop
- **Modified** to use prop instead of `result.targetWords`

**TargetedPracticeModal** (`components/results/TargetedPracticeModal.tsx`):
- **Added** `targetWords` prop
- **Modified** all calculations to use prop instead of `result.targetWords`

### 7. Database Helper (`lib/db/index.ts`)
- **Modified** aggregate functions to skip results without `targetWords`:
  - `getAggregateSlowSequences()`
  - `getAggregateSequenceTimings()`
  - `getAggregateMistakes()`

### 8. Firestore Security Rules (`firestore.rules`)
- **Added** rules for `testContents` collection:
  - Users can create/read/update their own testContent
  - No delete allowed (maintain history for retries)

### 9. Firestore Indexes (`firestore.indexes.json`)
- **Created** new index file
- **Added** composite indexes:
  - `userId + sourceId + createdAt` (for static test lookups)
  - `userId + contentHash + createdAt` (for AI test deduplication)
- **Updated** `firebase.json` to reference indexes file

## Key Features

### Content Deduplication
- **Static tests**: Looked up by `sourceId` to reuse the same testContent across all attempts
- **AI-generated tests**: Looked up by `contentHash` to detect identical content and maintain trial history
- Ensures all attempts at the same content share the same `testContentId`

### Trial History
- Multiple attempts at the same content are properly grouped
- Existing `getTestResultsByContent()` query works correctly
- Trial history component displays all attempts with proper linking

### Backward Compatibility
- Old test results without `testContentId` won't show "Try Again" button
- Old results with `targetWords` still display correctly
- Aggregate analytics handle both old and new test result formats

### Retry Functionality
1. User clicks "Try Again" on results page
2. System checks if testContent exists in Firestore
3. If exists, button is shown; if not, button is hidden
4. On click, testContent is fetched and test is reinitialized with same content
5. User navigates to home page to start the retry

## Testing Checklist
- [x] Build succeeds with no TypeScript errors
- [ ] Old tests without testContentId don't show "Try Again" button
- [ ] New tests can be retried successfully
- [ ] AI-generated content is saved and retriable
- [ ] Static content is deduplicated properly
- [ ] Trial history shows all attempts grouped correctly
- [ ] Aggregate analytics work with new structure
- [ ] Firebase rules restrict access properly
- [ ] No test content stored in localStorage

## Deployment Notes
1. Deploy new Firestore rules
2. Deploy Firestore indexes (may take time to build)
3. Deploy application code
4. Monitor for any runtime errors
5. Old tests will continue to work but won't be retryable (acceptable)

## Future Enhancements
- Consider migrating old test results to create testContent records
- Add bulk operations for testContent management
- Implement testContent cleanup for unused records
- Add UI for viewing/managing saved testContent


