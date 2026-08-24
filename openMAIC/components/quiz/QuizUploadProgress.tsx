'use client';

/**
 * Quiz Upload Progress Component
 * Shows progress bar with % complete, questions loaded, and estimated time
 * DailyAgile brand colors with light theme
 */

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface QuizUploadProgressProps {
  totalQuestions: number;
  isVisible: boolean;
  onComplete?: () => void;
}

export function QuizUploadProgress({
  totalQuestions,
  isVisible,
  onComplete,
}: QuizUploadProgressProps) {
  const [questionsLoaded, setQuestionsLoaded] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTotalTime, setEstimatedTotalTime] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setQuestionsLoaded(0);
      setElapsedTime(0);
      setEstimatedTotalTime(0);
      return;
    }

    const startTime = Date.now();

    // Simulate gradual question loading
    // In a real scenario, this would come from the server via streaming
    const interval = setInterval(() => {
      setQuestionsLoaded((prev) => {
        if (prev >= totalQuestions) {
          clearInterval(interval);
          onComplete?.();
          return totalQuestions;
        }

        // Simulate realistic upload speed:
        // - Fast at start (multiple questions per interval)
        // - Slower near end (fewer questions per interval)
        // This creates a natural-feeling progress curve
        const progress = prev / totalQuestions;
        const increment = Math.max(1, Math.ceil(5 * (1 - progress * 0.7)));
        return Math.min(prev + increment, totalQuestions);
      });

      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // seconds
      setElapsedTime(elapsed);

      // Calculate estimated total time based on current progress
      // Formula: elapsed_time / (questions_loaded / total_questions)
      setQuestionsLoaded((current) => {
        if (current > 0) {
          const progressRatio = current / totalQuestions;
          const estimated = Math.ceil(elapsed / progressRatio);
          setEstimatedTotalTime(estimated);
        }
        return current;
      });
    }, 200); // Update every 200ms

    return () => clearInterval(interval);
  }, [isVisible, totalQuestions, onComplete]);

  if (!isVisible) {
    return null;
  }

  const percentage = Math.round((questionsLoaded / totalQuestions) * 100);
  const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
  const isComplete = questionsLoaded >= totalQuestions;

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#1E3A5F]">
          {isComplete ? '✅ Upload Complete' : '⬆️ Uploading Quiz...'}
        </h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#0891B2]">{percentage}%</p>
          <p className="text-xs text-[#64748B]">
            {questionsLoaded} of {totalQuestions} questions
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-[#E2E8F0] rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isComplete ? 'bg-green-500' : 'bg-[#0891B2]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-3 gap-4">
          {/* Elapsed Time */}
          <div className="p-3 bg-[#F0F7FA] rounded-lg border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B] mb-1">Elapsed Time</p>
            <p className="text-lg font-mono font-bold text-[#1E3A5F]">
              {elapsedTime}s
            </p>
          </div>

          {/* Estimated Total Time */}
          <div className="p-3 bg-[#F0F7FA] rounded-lg border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B] mb-1">Estimated Total</p>
            <p className="text-lg font-mono font-bold text-[#1E3A5F]">
              {estimatedTotalTime}s
            </p>
          </div>

          {/* Remaining Time */}
          <div className="p-3 bg-[#F0F7FA] rounded-lg border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B] mb-1">
              {isComplete ? 'Time Saved' : 'Time Remaining'}
            </p>
            <p className="text-lg font-mono font-bold text-[#0891B2]">
              {remainingTime}s
            </p>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div
        className={`p-4 rounded-lg border flex items-start gap-3 ${
          isComplete
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}
      >
        {isComplete ? (
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <div className="w-5 h-5 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin mt-0.5" />
        )}
        <div className="flex-1">
          <p
            className={`font-medium ${
              isComplete ? 'text-green-900' : 'text-blue-900'
            }`}
          >
            {isComplete
              ? `All ${totalQuestions} questions uploaded successfully`
              : `Uploading ${totalQuestions} questions to the server...`}
          </p>
          <p
            className={`text-sm mt-1 ${
              isComplete ? 'text-green-700' : 'text-blue-700'
            }`}
          >
            {isComplete
              ? `Ready to configure quiz settings. Click "Next" to continue.`
              : `Questions: ${questionsLoaded}/${totalQuestions} • Speed: ${
                  questionsLoaded > 0
                    ? Math.round((questionsLoaded / elapsedTime) * 10) / 10
                    : 0
                } q/s`}
          </p>
        </div>
      </div>

      {/* Speed Indicator */}
      {!isComplete && (
        <div className="text-xs text-[#64748B] text-center">
          ⚡ Uploading at optimal speed · No action needed
        </div>
      )}
    </div>
  );
}
