'use client';

/**
 * CSV Upload Form Component
 * Allows instructors to upload and validate quiz CSV files
 * DailyAgile brand colors with light theme
 */

import { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { useCSRFToken } from '@/lib/hooks/useCSRFToken';
import { generateCSVTemplate } from '@/lib/quiz/csv-parser';

const log = createLogger('CSVUploadForm');

interface CSVUploadFormProps {
  onValidationComplete: (csvContent: string, isValid: boolean) => void;
  isLoading?: boolean;
}

export function CSVUploadForm({ onValidationComplete, isLoading = false }: CSVUploadFormProps) {
  const { token: csrfToken } = useCSRFToken();
  const [csvContent, setCSVContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    // Validate file type and size
    if (!file.name.endsWith('.csv')) {
      setError('Please select a .csv file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setError('File size exceeds 10MB limit');
      return;
    }

    try {
      setError(null);
      setValidating(true);
      setFileName(file.name);

      // Read file
      const text = await file.text();
      setCSVContent(text);

      // Validate via API with CSRF token
      const response = await fetch('/api/instructor/quiz/validate-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({ csv_content: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Validation failed');
        onValidationComplete(text, false);
        return;
      }

      if (!data.valid) {
        setError(`Validation failed: ${data.errors.length} errors found`);
        onValidationComplete(text, false);
      } else {
        setError(null);
        onValidationComplete(text, true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process file';
      setError(message);
      log.error('File processing failed:', err);
      onValidationComplete('', false);
    } finally {
      setValidating(false);
    }
  };

  const downloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F]">Upload Quiz CSV</h2>
        <p className="text-sm text-[#64748B] mt-1">
          Upload a CSV file with up to 50-100 questions. Format must include all required columns.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-[#0891B2] bg-[#F0F7FA]'
            : 'border-[#E2E8F0] bg-white hover:bg-[#F0F7FA]'
        } ${isLoading || validating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading || validating}
        />

        <div className="flex flex-col items-center gap-3">
          <Upload className="h-10 w-10 text-[#0891B2]" />
          <div>
            <p className="font-semibold text-[#1E3A5F]">
              {validating ? 'Validating CSV...' : 'Drag & drop your CSV here'}
            </p>
            <p className="text-sm text-[#64748B] mt-1">or</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || validating}
            className="px-4 py-2 bg-[#0891B2] text-white rounded-lg font-medium hover:bg-[#0a7e9a] disabled:opacity-50 transition-colors"
          >
            Choose File
          </button>
        </div>
      </div>

      {/* File Status */}
      {fileName && (
        <div className="flex items-center gap-2 p-3 bg-[#F0F7FA] rounded-lg border border-[#0891B2]">
          <CheckCircle className="h-5 w-5 text-[#0891B2]" />
          <span className="text-sm font-medium text-[#1E3A5F]">{fileName}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Validation Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="space-y-4 p-4 bg-[#F0F7FA] rounded-lg border border-[#E2E8F0]">
        <div>
          <h3 className="font-semibold text-[#1E3A5F] mb-2">Required CSV Format</h3>
          <p className="text-sm text-[#64748B] mb-3">
            Your CSV must include exactly 11 columns in this order:
          </p>
          <ul className="text-xs text-[#64748B] space-y-1 font-mono bg-white p-2 rounded border border-[#E2E8F0]">
            <li>1. question_number (1, 2, 3, ...)</li>
            <li>2. question (question text)</li>
            <li>3. timer_seconds (10-600)</li>
            <li>4-8. option_a, option_b, option_c, option_d, option_e</li>
            <li>9. correct_answer (A, B, C, D, or E)</li>
            <li>10. explanation (why this answer is correct)</li>
            <li>11. source_link (https://...)</li>
          </ul>
        </div>

        <button
          onClick={downloadTemplate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#0891B2] text-[#0891B2] rounded-lg font-medium hover:bg-[#F0F7FA] transition-colors"
        >
          <Download className="h-4 w-4" />
          Download CSV Template
        </button>
      </div>

      {/* Supported Features */}
      <div className="text-sm text-[#64748B] space-y-1">
        <p className="font-medium text-[#1E3A5F]">Supported:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>50-100 questions per quiz</li>
          <li>Multiple-choice only (5 options per question)</li>
          <li>Custom timer per question</li>
          <li>Explanations for each answer</li>
          <li>Source links for learning</li>
        </ul>
      </div>
    </div>
  );
}
