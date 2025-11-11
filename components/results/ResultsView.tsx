"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { TestResult } from "@/lib/types";
import { StatsCard } from "./StatsCard";
import { SequenceAnalysis } from "./SequenceAnalysis";
import { MistakeAnalysis } from "./MistakeAnalysis";
import { TargetedPracticeModal } from "./TargetedPracticeModal";
import { TrialHistory } from "./TrialHistory";
import {
  Zap,
  Target,
  Check,
  X,
  BrainCircuit,
  Trophy,
  Sparkles,
} from "lucide-react";
import { useTestStore } from "@/store/test-store";
import { useSettingsStore } from "@/store/settings-store";
import { useUserStore } from "@/store/user-store";
import { LabelSelector } from "../settings/LabelSelector";
import {
  updateTestResultLabels,
  getTimeTrialBestTime,
  getTestResultsByContent,
} from "@/lib/db/firebase";
import {
  getRandomTest,
  textToWords,
  calculateRequiredWords,
  getTestById,
} from "@/lib/test-content";
import { calculateSequenceTimings } from "@/lib/test-engine/calculations";
import {
  analyzeMistakes,
  getMistakeSequencesForPractice,
} from "@/lib/test-engine/mistake-analysis";

interface ResultsViewProps {
  result: TestResult;
}

export function ResultsView({ result }: ResultsViewProps) {
  const router = useRouter();
  const { defaultDuration, llmModel, llmTemperature } = useSettingsStore();
  const { initializeTest, resetTest, retryLastTest } = useTestStore();
  const { currentUserId, isAuthenticated } = useUserStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [currentLabels, setCurrentLabels] = useState<string[]>(
    result.labels || []
  );
  const [isSavingLabels, setIsSavingLabels] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  // Test content availability for retry and trial history
  const [canRetry, setCanRetry] = useState(false);
  const [canShowTrialHistory, setCanShowTrialHistory] = useState(false);
  const [isCheckingRetry, setIsCheckingRetry] = useState(true);

  // Target words (fetched from testContent if not in result)
  const [targetWords, setTargetWords] = useState<string[]>(
    result.targetWords || []
  );

  // Time trial state
  const [timeTrialMessage, setTimeTrialMessage] = useState<{
    type: "first" | "new-best" | "not-best";
    message: string;
    improvement?: number;
    previousBest?: number;
  } | null>(null);
  const [isLoadingTimeTrialData, setIsLoadingTimeTrialData] = useState(false);

  // Trial history state
  const [trialHistory, setTrialHistory] = useState<TestResult[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Check for time trial and generate message based on result data
  useEffect(() => {
    async function loadTimeTrialData() {
      if (result.isTimeTrial && result.timeTrialId && result.completionTime) {
        const completionTime = result.completionTime;
        let previousBest = result.previousBestTime;
        const testContent = getTestById(result.timeTrialId);
        const trialName = testContent?.title || "Time Trial";

        // If previousBestTime is not set in the result (e.g., old results before the fix),
        // fetch the current best time from Firestore
        if (previousBest === undefined && result.userId) {
          try {
            const { getTimeTrialBestTime } = await import('@/lib/db/firebase');
            const currentBest = await getTimeTrialBestTime(result.userId, result.timeTrialId);
            
            // If there's a current best time and it's different from this completion time,
            // then this completion had a previous best
            if (currentBest !== null && currentBest !== completionTime) {
              previousBest = currentBest;
            }
            // If currentBest === completionTime, this might be the first OR a new best
            // If currentBest === null, definitely first completion
          } catch (error) {
            console.error('Failed to fetch time trial best time:', error);
            // Continue with previousBest as undefined
          }
        }

        if (previousBest === undefined) {
          // This is the first completion
          setTimeTrialMessage({
            type: "first",
            message: `Congratulations on your first completion! You finished ${trialName} in ${completionTime.toFixed(
              1
            )} seconds. Try again to beat your time!`,
          });
        } else if (completionTime < previousBest) {
          // New best time!
          const improvement = previousBest - completionTime;
          const improvementPercent = ((improvement / previousBest) * 100).toFixed(
            1
          );
          setTimeTrialMessage({
            type: "new-best",
            message: `Amazing! You crushed your personal record by ${improvement.toFixed(
              1
            )} seconds (${improvementPercent}% faster)! You're on fire!`,
            improvement,
            previousBest,
          });

          // Trigger confetti
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
            colors: ["#FFD700", "#FFA500", "#FF6347", "#FF1493"],
          });
        } else {
          // Not a new best
          const difference = completionTime - previousBest;
          setTimeTrialMessage({
            type: "not-best",
            message: `You completed in ${completionTime.toFixed(
              1
            )} seconds. Your best is ${previousBest.toFixed(
              1
            )} seconds (${difference.toFixed(1)}s slower). Keep practicing!`,
            previousBest,
          });
        }

        setIsLoadingTimeTrialData(false);
      }
    }

    loadTimeTrialData();
  }, [result]);

  // Check if test content is available for retry and fetch targetWords if needed
  useEffect(() => {
    async function checkTestContent() {
      // Can only retry if test has a testContentId
      if (!result.testContentId) {
        setCanRetry(false);
        setIsCheckingRetry(false);
        return;
      }

      try {
        const { getTestContent } = await import("@/lib/db/firebase");
        const testContent = await getTestContent(result.testContentId);

        if (testContent) {
          setCanRetry(true);
          setCanShowTrialHistory(true);
          // If result doesn't have targetWords, use the ones from testContent
          if (!result.targetWords || result.targetWords.length === 0) {
            setTargetWords(testContent.words);
          }
        } else {
          setCanRetry(false);
          setCanShowTrialHistory(false);
        }
      } catch (error) {
        console.error("Failed to check test content:", error);
        setCanRetry(false);
        setCanShowTrialHistory(false);
      } finally {
        setIsCheckingRetry(false);
      }
    }

    checkTestContent();
  }, [result.testContentId, result.targetWords]);

  // Load trial history for this content
  useEffect(() => {
    // Only load history if:
    // - User is authenticated
    // - Result is saved (has userId)
    // - Not a practice test
    // - testContent exists (canShowTrialHistory)
    if (
      canShowTrialHistory &&
      currentUserId &&
      result.userId &&
      result.testContentId &&
      !result.isPractice
    ) {
      setIsLoadingHistory(true);

      getTestResultsByContent(currentUserId, result.testContentId)
        .then((history) => {
          // Filter out the current result and practice tests
          const filteredHistory = history.filter((h) => !h.isPractice);
          setTrialHistory(filteredHistory);
        })
        .catch((error) => {
          console.error("Failed to load trial history:", error);
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    } else {
      // Clear trial history if conditions not met
      setTrialHistory([]);
      setIsLoadingHistory(false);
    }
  }, [
    canShowTrialHistory,
    currentUserId,
    result.userId,
    result.testContentId,
    result.isPractice,
    result.id,
  ]);

  // Calculate sequence timings
  const twoCharSequences = useMemo(
    () => calculateSequenceTimings(result.keystrokeTimings, targetWords, 2, 10),
    [result.keystrokeTimings, targetWords]
  );

  const threeCharSequences = useMemo(
    () => calculateSequenceTimings(result.keystrokeTimings, targetWords, 3, 10),
    [result.keystrokeTimings, targetWords]
  );

  const handleTryAgain = async () => {
    try {
      // Retry the same test configuration and go back to home
      await retryLastTest();
      router.push("/");
    } catch (error) {
      console.error("Failed to retry test:", error);
      alert(
        "Failed to retry test. The test content may no longer be available."
      );
    }
  };

  const handleNewTest = () => {
    // Initialize a new test and go to home
    const testContent = getRandomTest();
    const requiredWords =
      defaultDuration === "content-length"
        ? 100
        : calculateRequiredWords(defaultDuration);
    const words = textToWords(testContent.text, requiredWords);

    initializeTest(
      {
        duration: defaultDuration,
        testContentId: testContent.id,
      },
      words
    );

    router.push("/");
  };

  const handleLabelsChange = async (labels: string[]) => {
    // Update local state immediately for UI responsiveness
    setCurrentLabels(labels);
    setLabelError(null);

    // Only save to database if the test result is saved and user is authenticated
    if (result.userId && currentUserId && isAuthenticated) {
      setIsSavingLabels(true);
      try {
        await updateTestResultLabels(result.id, currentUserId, labels);
      } catch (error) {
        console.error("Failed to update labels:", error);
        setLabelError("Failed to save labels. Please try again.");
        // Revert to original labels on error
        setCurrentLabels(result.labels || []);
      } finally {
        setIsSavingLabels(false);
      }
    }
  };

  const handleGenerateTargetedPractice = async (
    selectedSequences: string[],
    selectedWords: string[]
  ) => {
    setPracticeError(null);
    setIsGeneratingPractice(true);
    setIsModalOpen(false); // Close modal

    try {
      // Combine sequences and words for practice
      if (selectedSequences.length === 0 && selectedWords.length === 0) {
        setPracticeError("Please select at least one item to practice");
        setIsGeneratingPractice(false);
        return;
      }

      const requiredWords =
        defaultDuration === "content-length"
          ? 100
          : calculateRequiredWords(defaultDuration);

      // Determine which API endpoint to use based on selections
      // If we have words, use the mistake practice endpoint, otherwise use regular practice
      const hasMistakeData = selectedWords.length > 0;

      let response;
      if (hasMistakeData) {
        // Use mistake practice endpoint which can handle both sequences and words
        response = await fetch("/api/generate-mistake-practice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sequences: selectedSequences,
            mistakeData: {
              commonWords: selectedWords.map((word) => ({
                target: word,
                typed: "",
                count: 1,
              })),
            },
            options: {
              model: llmModel,
              temperature: llmTemperature,
              minWords: requiredWords,
            },
          }),
        });
      } else {
        // Use regular practice endpoint for sequences only
        response = await fetch("/api/generate-practice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sequences: selectedSequences,
            options: {
              model: llmModel,
              temperature: llmTemperature,
              minWords: requiredWords,
            },
          }),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate practice content");
      }

      const practiceResult = await response.json();
      const words = textToWords(practiceResult.text, requiredWords);

      // Initialize test with practice metadata
      // Combine sequences and words - treat them all as practice targets
      const allPracticeTargets = [...selectedSequences, ...selectedWords];

      resetTest();
      initializeTest(
        {
          duration: defaultDuration,
          testContentId: "ai-targeted-practice",
          isPractice: true,
          practiceSequences: allPracticeTargets,
        },
        words
      );

      router.push("/");
    } catch (error) {
      console.error("Practice generation error:", error);
      setPracticeError(
        error instanceof Error
          ? error.message
          : "Failed to generate practice content"
      );
    } finally {
      setIsGeneratingPractice(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <h1 className="text-4xl font-bold text-center mb-8">Test Complete!</h1>

        {/* Actions */}
        <div className="flex gap-4 justify-center flex-wrap mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isGeneratingPractice}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isGeneratingPractice ? (
              <>
                <BrainCircuit className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Target className="w-5 h-5" />
                Generate Targeted Practice
              </>
            )}
          </button>
          <Link
            href="/stats"
            className="px-6 py-3 bg-editor-muted/50 hover:bg-editor-muted/70 text-editor-fg rounded-lg font-medium transition-colors"
          >
            View Stats
          </Link>
          {canRetry && (
            <button
              onClick={handleTryAgain}
              className="px-6 py-3 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          )}
          {isCheckingRetry && (
            <button
              disabled
              className="px-6 py-3 bg-editor-muted/50 text-editor-fg rounded-lg font-medium cursor-not-allowed"
            >
              Loading...
            </button>
          )}
          <button
            onClick={handleNewTest}
            className="px-6 py-3 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
          >
            New Test
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatsCard
            label="Words Per Minute"
            value={result.wpm}
            icon={<Zap className="w-8 h-8" />}
          />
          {/* Combined Accuracy Card */}
          {(() => {
            const isStrictOrTimeTrial = result.isTimeTrial || result.labels?.includes('correction-mode-strict');
            
            if (isStrictOrTimeTrial) {
              // For strict/time trial: show Accuracy (high) and Error Rate (low)
              // Calculate actual accuracy from correct/total words
              const actualAccuracy = result.totalTypedWords > 0 
                ? ((result.correctWordCount / result.totalTypedWords) * 100).toFixed(1)
                : '100.0';
              
              return (
                <div className="bg-editor-bg border border-editor-muted rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute inset-0 bg-gradient-to-br from-editor-accent/5 to-transparent pointer-events-none" />
                  
                  <div className="relative z-10 w-full flex flex-col items-center">
                    <div className="mb-3 text-editor-accent">
                      <Target className="w-8 h-8" />
                    </div>
                    <div className="flex items-center gap-8 mb-3 w-full">
                      <div className="text-center w-[42%]">
                        <div className="inline-block bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 mb-2">
                          <div className="text-4xl font-bold font-mono text-green-400">{actualAccuracy}%</div>
                        </div>
                        <div className="text-xs font-medium text-editor-muted uppercase tracking-wider">Accuracy</div>
                      </div>
                      <div className="h-16 w-px bg-editor-muted/30"></div>
                      <div className="text-center w-[42%]">
                        <div className="inline-block bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-2 mb-2">
                          <div className="text-4xl font-bold font-mono text-orange-400">
                            {result.perCharacterAccuracy !== undefined ? `${result.perCharacterAccuracy}%` : '—'}
                          </div>
                        </div>
                        <div className="text-xs font-medium text-editor-muted uppercase tracking-wider">Error Rate</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-editor-accent uppercase tracking-wider">Strict Mode</div>
                  </div>
                </div>
              );
            } else {
              // Normal mode: show per-word and per-character accuracy
              return (
                <div className="bg-editor-bg border border-editor-muted rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                  
                  <div className="relative z-10 w-full flex flex-col items-center">
                    <div className="mb-3 text-editor-accent">
                      <Target className="w-8 h-8" />
                    </div>
                    <div className="flex items-center gap-8 mb-3 w-full">
                      <div className="text-center w-[42%]">
                        <div className="inline-block bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 mb-2">
                          <div className="text-4xl font-bold font-mono text-blue-400">{result.accuracy}%</div>
                        </div>
                        <div className="text-xs font-medium text-editor-muted uppercase tracking-wider">Per-Word</div>
                      </div>
                      <div className="h-16 w-px bg-editor-muted/30"></div>
                      <div className="text-center w-[42%]">
                        <div className="inline-block bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-2 mb-2">
                          <div className="text-4xl font-bold font-mono text-purple-400">
                            {result.perCharacterAccuracy !== undefined ? `${result.perCharacterAccuracy}%` : '—'}
                          </div>
                        </div>
                        <div className="text-xs font-medium text-editor-muted uppercase tracking-wider">Per-Character</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-editor-muted uppercase tracking-wider">Accuracy</div>
                  </div>
                </div>
              );
            }
          })()}
        </div>

        {/* Time Trial Message */}
        {result.isTimeTrial && !isLoadingTimeTrialData && timeTrialMessage && (
          <div
            className={`rounded-lg p-6 mb-8 border ${
              timeTrialMessage.type === "new-best"
                ? "bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-400/50"
                : timeTrialMessage.type === "first"
                ? "bg-blue-600/10 border-blue-400/30"
                : "bg-gray-600/10 border-gray-400/30"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {timeTrialMessage.type === "new-best" ? (
                  <Trophy className="w-10 h-10 text-yellow-400 animate-pulse" />
                ) : (
                  <Trophy className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3
                  className={`text-2xl font-bold mb-2 ${
                    timeTrialMessage.type === "new-best"
                      ? "text-yellow-400"
                      : timeTrialMessage.type === "first"
                      ? "text-blue-400"
                      : "text-gray-300"
                  }`}
                >
                  {timeTrialMessage.type === "new-best" && (
                    <>
                      <Sparkles className="inline w-7 h-7 mr-2 animate-pulse" />
                      New Personal Record!
                      <Sparkles className="inline w-7 h-7 ml-2 animate-pulse" />
                    </>
                  )}
                  {timeTrialMessage.type === "first" && "First Completion!"}
                  {timeTrialMessage.type === "not-best" && "Keep Trying!"}
                </h3>
                <p
                  className={`text-lg ${
                    timeTrialMessage.type === "new-best"
                      ? "text-yellow-100 font-medium"
                      : "text-editor-fg"
                  }`}
                >
                  {timeTrialMessage.message}
                </p>
                {result.completionTime && (
                  <div className="mt-4 flex gap-6 text-sm">
                    <div>
                      <span className="text-editor-muted">Your Time: </span>
                      <span
                        className={`font-bold text-xl ${
                          timeTrialMessage.type === "new-best"
                            ? "text-yellow-400"
                            : "text-green-400"
                        }`}
                      >
                        {result.completionTime.toFixed(1)}s
                      </span>
                    </div>
                    {timeTrialMessage.previousBest && (
                      <>
                        <div>
                          <span className="text-editor-muted">
                            Previous Best:{" "}
                          </span>
                          <span className="font-bold text-lg">
                            {timeTrialMessage.previousBest.toFixed(1)}s
                          </span>
                        </div>
                        {timeTrialMessage.improvement && (
                          <div>
                            <span className="text-editor-muted">
                              Improvement:{" "}
                            </span>
                            <span className="font-bold text-lg text-green-400">
                              -{timeTrialMessage.improvement.toFixed(1)}s
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Labels Section */}
        {isAuthenticated && result.userId && (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Labels</h2>
              {isSavingLabels && (
                <span className="text-sm text-editor-muted">Saving...</span>
              )}
            </div>
            {labelError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                {labelError}
              </div>
            )}
            <LabelSelector
              selectedLabels={currentLabels}
              onLabelsChange={handleLabelsChange}
              disabled={isSavingLabels}
              inline={true}
            />
          </div>
        )}

        {/* Trial History */}
        {/* Only show trial history if testContent exists and we have history */}
        {canShowTrialHistory &&
          !isLoadingHistory &&
          trialHistory.length > 0 && (
            <div className="mb-8">
              <TrialHistory history={trialHistory} currentResult={result} />
            </div>
          )}
        {/* Show loading state while checking */}
        {isCheckingRetry && (
          <div className="mb-8 bg-editor-bg border border-editor-muted rounded-lg p-6">
            <p className="text-sm text-editor-muted text-center">
              Loading trial history...
            </p>
          </div>
        )}

        {/* Detailed Stats */}
        <div className="bg-editor-bg border border-editor-muted rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Detailed Statistics</h2>
          <div className="space-y-3 text-editor-fg">
            <div className="flex justify-between items-center">
              <span className="text-editor-muted">Words Typed:</span>
              <span className="font-mono font-bold">
                {result.totalTypedWords}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-editor-muted flex items-center gap-2">
                <Check className="w-4 h-4 text-editor-success" />
                Correct Words:
              </span>
              <span className="font-mono font-bold text-editor-success">
                {result.correctWordCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-editor-muted flex items-center gap-2">
                <X className="w-4 h-4 text-editor-error" />
                Mistakes:
              </span>
              <span className="font-mono font-bold text-editor-error">
                {result.incorrectWordCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-editor-muted">Test Duration:</span>
              <span className="font-mono font-bold">{result.duration}s</span>
            </div>
          </div>
        </div>

        {/* Sequence Analysis */}
        <div className="mb-8">
          <SequenceAnalysis
            twoCharSequences={twoCharSequences}
            threeCharSequences={threeCharSequences}
          />
        </div>

        {/* Mistake Analysis */}
        <div className="mb-8">
          <MistakeAnalysis result={result} targetWords={targetWords} />
        </div>

        {/* Practice Error */}
        {practiceError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-8">
            <p className="text-sm text-red-400">{practiceError}</p>
          </div>
        )}

        {/* Generating Practice Loading State */}
        {isGeneratingPractice && (
          <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <BrainCircuit className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-400 mb-1">
                  Generating Targeted Practice...
                </h3>
                <p className="text-sm text-editor-muted">
                  Creating custom content for your selected sequences. This may
                  take a few moments.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Targeted Practice Modal */}
      <TargetedPracticeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        result={result}
        targetWords={targetWords}
        onGeneratePractice={handleGenerateTargetedPractice}
      />
    </div>
  );
}
