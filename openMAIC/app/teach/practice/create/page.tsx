'use client';

/**
 * Create Quiz from CSV — Full Integration Page
 * Instructor workflow: Upload CSV → Validate → Configure → Create Quiz
 * Uses all 3 instructor components together
 */

import { useState } from 'react';
import { CSVUploadForm } from '@/components/quiz/CSVUploadForm';
import { CSVValidationResult } from '@/components/quiz/CSVValidationResult';
import { QuizSettingsForm } from '@/components/quiz/QuizSettingsForm';
import { QuizUploadProgress } from '@/components/quiz/QuizUploadProgress';
import { useCSRFToken } from '@/lib/hooks/useCSRFToken';
import { createLogger } from '@/lib/logger';

const log = createLogger('CreateQuizPage');

enum Step {
  UPLOAD = 'upload',
  VALIDATE = 'validate',
  SETTINGS = 'settings',
  CREATING = 'creating',
  SUCCESS = 'success',
}

interface ValidationData {
  csvContent: string;
  valid: boolean;
  totalQuestions: number;
  errors: Array<{
    row: number;
    column: string;
    value: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    column: string;
    value: string;
    message: string;
  }>;
  summary?: {
    total_points: number;
    estimated_duration_minutes: number;
  };
}

export default function CreateQuizPage() {
  const { token: csrfToken } = useCSRFToken();
  const [currentStep, setCurrentStep] = useState<Step>(Step.UPLOAD);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [createdQuizCode, setCreatedQuizCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Handle CSV validation completion
  const handleValidationComplete = async (csvContent: string, isValid: boolean) => {
    try {
      setIsLoading(true);

      if (!isValid) {
        setValidationData({
          csvContent,
          valid: false,
          totalQuestions: 0,
          errors: [],
          warnings: [],
        });
        setCurrentStep(Step.VALIDATE);
        return;
      }

      // Call validation API with CSRF token
      const response = await fetch('/api/instructor/quiz/validate-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({ csv_content: csvContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        log.error('Validation API error:', data);
        setValidationData({
          csvContent,
          valid: false,
          totalQuestions: 0,
          errors: [
            {
              row: 0,
              column: 'general',
              value: '',
              message: data.error?.message || 'Failed to validate CSV',
            },
          ],
          warnings: [],
        });
      } else {
        setValidationData({
          csvContent,
          valid: data.valid,
          totalQuestions: data.total_questions,
          errors: data.errors || [],
          warnings: data.warnings || [],
          summary: data.summary,
        });
      }

      setCurrentStep(Step.VALIDATE);
    } catch (error) {
      log.error('Validation failed:', error);
      setValidationData({
        csvContent,
        valid: false,
        totalQuestions: 0,
        errors: [
          {
            row: 0,
            column: 'general',
            value: '',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        warnings: [],
      });
      setCurrentStep(Step.VALIDATE);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle validation retry (go back to upload)
  const handleValidationRetry = () => {
    setValidationData(null);
    setCurrentStep(Step.UPLOAD);
  };

  // Step 3: Handle settings form submission
  const handleSettingsSubmit = async (settings: any) => {
    if (!validationData) return;

    try {
      setIsLoading(true);
      setCurrentStep(Step.CREATING);

      // For development/testing: use actual classroom ID and auth token
      // In production, these would come from actual auth
      const testClassroomId = '550e8400-e29b-41d4-a716-446655440000';
      const testAuthToken = 'test-instructor-token';

      // Call create quiz API with CSRF token
      const response = await fetch('/api/instructor/quiz/create-from-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAuthToken}`, // Send auth header
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({
          classroom_id: testClassroomId, // Use test classroom
          title: settings.title,
          description: settings.description,
          csv_content: validationData.csvContent,
          settings: {
            show_answers_after_submit: settings.show_answers_after_submit,
            allow_retakes: settings.allow_retakes,
            passing_score: settings.passing_score,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract error message from response
        const errorMsg = data.error?.message || data.message || 'Failed to create quiz';
        throw new Error(errorMsg);
      }

      setCreatedQuizId(data.quiz_id);
      setCreatedQuizCode(data.quiz_code);
      setCurrentStep(Step.SUCCESS);
    } catch (error) {
      log.error('Failed to create quiz:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Handle success (reset and start over)
  const handleCreateAnother = () => {
    setCurrentStep(Step.UPLOAD);
    setValidationData(null);
    setCreatedQuizId(null);
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-[#1E3A5F] mb-2">Create Quiz from CSV</h1>
          <p className="text-lg text-[#64748B]">Upload a CSV file with up to 100 questions</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-12 flex justify-between items-center">
          {[Step.UPLOAD, Step.VALIDATE, Step.SETTINGS, Step.SUCCESS].map((step, index) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full font-bold flex items-center justify-center transition-colors ${
                  currentStep === step || (Step.SUCCESS === currentStep && index <= 3)
                    ? 'bg-[#0891B2] text-white'
                    : Step.UPLOAD === currentStep && index > 0
                      ? 'bg-[#E2E8F0] text-[#64748B]'
                      : 'bg-green-200 text-green-900'
                }`}
              >
                {index + 1}
              </div>
              <div className="text-center flex-1">
                <p className="text-sm font-medium text-[#1E3A5F] mt-2">
                  {index === 0 && 'Upload CSV'}
                  {index === 1 && 'Validate'}
                  {index === 2 && 'Configure'}
                  {index === 3 && 'Complete'}
                </p>
              </div>
              {index < 3 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    (Step.SUCCESS === currentStep && index < 3) ||
                    (Step.SETTINGS === currentStep && index < 2) ||
                    (Step.VALIDATE === currentStep && index === 0)
                      ? 'bg-[#0891B2]'
                      : 'bg-[#E2E8F0]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-[#F0F7FA] rounded-lg p-8 border border-[#E2E8F0]">
          {/* Step 1: Upload */}
          {currentStep === Step.UPLOAD && (
            <CSVUploadForm
              onValidationComplete={handleValidationComplete}
              isLoading={isLoading}
            />
          )}

          {/* Step 2: Validate */}
          {currentStep === Step.VALIDATE && validationData && (
            <CSVValidationResult
              valid={validationData.valid}
              totalQuestions={validationData.totalQuestions}
              errors={validationData.errors}
              warnings={validationData.warnings}
              summary={validationData.summary}
              isLoading={isLoading}
              onRetry={handleValidationRetry}
              onProceed={() => setCurrentStep(Step.SETTINGS)}
            />
          )}

          {/* Step 3: Settings */}
          {currentStep === Step.SETTINGS && validationData && (
            <QuizSettingsForm
              totalQuestions={validationData.totalQuestions}
              totalPoints={validationData.summary?.total_points || validationData.totalQuestions * 10}
              onSubmit={handleSettingsSubmit}
              isLoading={isLoading}
              onBack={() => setCurrentStep(Step.VALIDATE)}
            />
          )}

          {/* Step 4: Creating with Progress */}
          {currentStep === Step.CREATING && validationData && (
            <div className="py-8">
              <QuizUploadProgress
                totalQuestions={validationData.totalQuestions}
                isVisible={true}
                onComplete={() => {
                  // Auto-advance to success after progress completes
                  setTimeout(() => setCurrentStep(Step.SUCCESS), 500);
                }}
              />
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === Step.SUCCESS && (
            <div className="space-y-6 text-center py-12">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#1E3A5F]">Quiz Created Successfully! 🎉</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#64748B] mb-2">Quiz Code (Share with students):</p>
                  <code className="text-4xl font-bold text-[#0891B2] bg-white px-6 py-3 rounded border-2 border-[#0891B2]">
                    {createdQuizCode}
                  </code>
                </div>
                <p className="text-[#64748B]">
                  {validationData?.totalQuestions} questions • {validationData?.summary?.total_points} points •{' '}
                  {validationData?.summary?.estimated_duration_minutes} min
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-4">
                <button
                  onClick={handleCreateAnother}
                  className="px-6 py-2 bg-[#0891B2] text-white rounded-lg font-semibold hover:bg-[#0a7e9a] transition-colors"
                >
                  Create Another Quiz
                </button>
                <button
                  onClick={() => (window.location.href = `/learn/practice/${createdQuizCode}`)}
                  className="px-6 py-2 border border-[#0891B2] text-[#0891B2] rounded-lg font-semibold hover:bg-[#F0F7FA] transition-colors"
                >
                  View Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
