'use client';

/**
 * CSV Validation Result Component
 * Shows detailed validation errors/warnings and quiz summary
 * DailyAgile brand colors with light theme
 */

import { AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
}

interface ValidationWarning {
  row: number;
  column: string;
  value: string;
  message: string;
}

interface CSVValidationResultProps {
  valid: boolean;
  totalQuestions: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary?: {
    total_points: number;
    estimated_duration_minutes: number;
  };
  isLoading?: boolean;
  onProceed?: () => void;
  onRetry?: () => void;
}

export function CSVValidationResult({
  valid,
  totalQuestions,
  errors,
  warnings,
  summary,
  isLoading = false,
  onProceed,
  onRetry,
}: CSVValidationResultProps) {
  const [expandErrors, setExpandErrors] = useState(true);
  const [expandWarnings, setExpandWarnings] = useState(true);

  if (!valid && errors.length === 0) {
    return (
      <div className="w-full max-w-2xl space-y-6">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Validation Error</p>
            <p className="text-sm text-red-700 mt-1">Unable to parse CSV file</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F]">
          {valid ? 'CSV Validated Successfully' : 'Validation Issues Found'}
        </h2>
        <p className="text-sm text-[#64748B] mt-1">
          {valid
            ? 'Your CSV is ready. Review details below before creating the quiz.'
            : `${errors.length} error${errors.length !== 1 ? 's' : ''} must be fixed before proceeding.`}
        </p>
      </div>

      {/* Summary Card */}
      {valid && summary && (
        <div className="p-4 bg-[#F0F7FA] rounded-lg border border-[#0891B2]">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-[#1E3A5F]">{totalQuestions}</p>
              <p className="text-xs text-[#64748B] mt-1">Questions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E3A5F]">{summary.total_points}</p>
              <p className="text-xs text-[#64748B] mt-1">Total Points</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E3A5F]">~{summary.estimated_duration_minutes}</p>
              <p className="text-xs text-[#64748B] mt-1">Min Duration</p>
            </div>
          </div>
        </div>
      )}

      {/* Errors Section */}
      {errors.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setExpandErrors(!expandErrors)}
            className="w-full flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-red-900">
                {errors.length} Error{errors.length !== 1 ? 's' : ''} Found
              </span>
            </div>
            {expandErrors ? (
              <ChevronUp className="h-4 w-4 text-red-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-red-600" />
            )}
          </button>

          {expandErrors && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {errors.map((error, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm space-y-1"
                >
                  <div className="flex justify-between">
                    <span className="font-mono text-red-700">
                      Row {error.row}, Column "{error.column}"
                    </span>
                    <code className="text-xs bg-white px-2 py-1 rounded border border-red-200 text-red-700">
                      {error.value || '(empty)'}
                    </code>
                  </div>
                  <p className="text-red-700">{error.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setExpandWarnings(!expandWarnings)}
            className="w-full flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold text-yellow-900">
                {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
              </span>
            </div>
            {expandWarnings ? (
              <ChevronUp className="h-4 w-4 text-yellow-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-yellow-600" />
            )}
          </button>

          {expandWarnings && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm space-y-1"
                >
                  <div className="flex justify-between">
                    <span className="font-mono text-yellow-700">
                      Row {warning.row}, Column "{warning.column}"
                    </span>
                  </div>
                  <p className="text-yellow-700">{warning.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {valid && errors.length === 0 && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">Ready to Create Quiz</p>
            <p className="text-sm text-green-700 mt-1">
              All {totalQuestions} questions are properly formatted. Proceed to configure quiz settings.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-[#0891B2] text-[#0891B2] rounded-lg font-medium hover:bg-[#F0F7FA] disabled:opacity-50 transition-colors"
          >
            Upload Different File
          </button>
        )}
        {valid && onProceed && (
          <button
            onClick={onProceed}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-[#0891B2] text-white rounded-lg font-medium hover:bg-[#0a7e9a] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Processing...' : 'Proceed to Settings'}
          </button>
        )}
      </div>
    </div>
  );
}
