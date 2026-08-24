'use client';

/**
 * Student Roster CSV Import Component
 * Drag-and-drop file upload with validation preview and two-step flow
 *
 * Features:
 * - Drag-and-drop file upload
 * - CSV file preview with validation before import
 * - Two-step flow: validate → preview → import
 * - Progress bar during import
 * - Error/valid row highlighting
 * - Download error report
 */

import { useState, useCallback } from 'react';
import {
  Upload,
  File,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  X,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  parseCSV,
  readCSVFile,
  generateCSVTemplate,
  downloadFile,
  exportParseErrorsAsCSV,
} from '@/lib/ilt/parsing/csv-parser';
import type { ParseResult } from '@/lib/ilt/parsing/csv-parser';
import { toast } from '@/components/ilt/ui/Toast';

interface StudentRosterImportProps {
  classroom_id: string;
  on_success?: (count: number) => void;
  on_cancel?: () => void;
}

type ImportStep = 'upload' | 'preview' | 'importing';

export function StudentRosterImport({
  classroom_id,
  on_success,
  on_cancel,
}: StudentRosterImportProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Invalid file type', 'Please upload a CSV file.');
      return;
    }

    setSelectedFile(file);

    try {
      const csvText = await readCSVFile(file);
      const result = parseCSV(csvText);
      setParseResult(result);
      setStep('preview');
      setImportError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      setImportError(message);
      toast.error('Failed to read CSV', message);
    }
  }, []);

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle import
  const handleImport = useCallback(async () => {
    if (!parseResult || parseResult.valid_count === 0) return;

    setIsImporting(true);
    setImportError(null);

    try {
      setStep('importing');
      const toastId = toast.loading(
        `Importing ${parseResult.valid_count} student(s)...`,
      );

      let successCount = 0;
      const errors: Array<{ email: string; error: string }> = [];

      // Import each valid row
      for (let i = 0; i < parseResult.valid_rows.length; i++) {
        const student = parseResult.valid_rows[i];
        setImportProgress(Math.round(((i + 1) / parseResult.valid_rows.length) * 100));

        try {
          const response = await fetch(
            `/api/classrooms/${classroom_id}/students`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
              },
              body: JSON.stringify({
                email: student.email,
                name: student.name,
                student_id: student.student_id || undefined,
              }),
            },
          );

          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            errors.push({
              email: student.email,
              error: errorData.error?.message || 'Failed to add student',
            });
          }
        } catch (err) {
          errors.push({
            email: student.email,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      toast.dismiss(toastId);

      if (successCount > 0) {
        toast.success(`${successCount} student(s) imported!`, 'Enrollment emails have been sent.');
      }

      if (errors.length > 0) {
        toast.warning?.(`${errors.length} student(s) could not be imported`, 'Some errors occurred during import.');
      }

      on_success?.(successCount);

      // Reset form after success
      setTimeout(() => {
        setStep('upload');
        setSelectedFile(null);
        setParseResult(null);
        setImportProgress(0);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setImportError(message);
      toast.error('Import failed', message);
    } finally {
      setIsImporting(false);
    }
  }, [parseResult, classroom_id, on_success]);

  // Handle download template
  const handleDownloadTemplate = useCallback(() => {
    const template = generateCSVTemplate();
    downloadFile(template, 'student-roster-template.csv');
    toast.success('Template downloaded');
  }, []);

  // Handle download errors
  const handleDownloadErrors = useCallback(() => {
    if (!parseResult) return;
    const csv = exportParseErrorsAsCSV(parseResult);
    downloadFile(csv, 'import-errors.csv');
  }, [parseResult]);

  // Upload Step
  if (step === 'upload') {
    return (
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Import Students from CSV</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Upload a CSV file with student information. Expected columns: Email, Name, Student ID (optional).
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? 'border-teal-500 bg-teal-50'
              : 'border-zinc-300 hover:border-teal-400'
          }`}
        >
          <Upload className="mx-auto h-12 w-12 text-zinc-400 mb-3" />
          <div className="mb-4">
            <p className="text-sm font-medium text-zinc-900">
              Drag and drop your CSV file here, or
            </p>
            <label className="text-sm font-medium text-teal-600 hover:text-teal-700 cursor-pointer">
              click to browse
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                aria-label="Upload CSV file"
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-zinc-500">
            CSV files only. Maximum 10,000 students per file.
          </p>
        </div>

        {/* Template Download */}
        <div className="rounded-lg bg-zinc-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">Need a template?</p>
              <p className="text-xs text-zinc-600 mt-1">
                Download our CSV template to ensure correct formatting.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              aria-label="Download CSV template"
              className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50"
            >
              <Download className="h-4 w-4" />
              Template
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={on_cancel}
            aria-label="Cancel import"
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Preview Step
  if (step === 'preview' && parseResult) {
    return (
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Review Import</h3>
          <p className="mt-2 text-sm text-zinc-600">
            File: <span className="font-medium">{selectedFile?.name}</span>
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-sm text-teal-700 font-medium">
                  {parseResult.valid_count}
                </p>
                <p className="text-xs text-teal-600">Valid</p>
              </div>
            </div>
          </div>

          {parseResult.invalid_count > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-red-700 font-medium">
                    {parseResult.invalid_count}
                  </p>
                  <p className="text-xs text-red-600">Errors</p>
                </div>
              </div>
            </div>
          )}

          {parseResult.duplicate_count > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-yellow-700 font-medium">
                    {parseResult.duplicate_count}
                  </p>
                  <p className="text-xs text-yellow-600">Duplicates</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Valid Rows Preview */}
        {parseResult.valid_rows.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-zinc-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
              Valid Rows ({parseResult.valid_rows.length})
            </h4>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-zinc-700">
                      Email
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-700">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-700">
                      Student ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.valid_rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-zinc-100">
                      <td className="px-3 py-2 text-zinc-900">{row.email}</td>
                      <td className="px-3 py-2 text-zinc-700">{row.name}</td>
                      <td className="px-3 py-2 text-zinc-600">
                        {row.student_id || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.valid_rows.length > 5 && (
                <div className="px-3 py-2 text-center text-xs text-zinc-500 border-t border-zinc-100">
                  ... and {parseResult.valid_rows.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invalid Rows Warning */}
        {parseResult.invalid_rows.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Errors ({parseResult.invalid_rows.length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
              {parseResult.invalid_rows.slice(0, 5).map((row, i) => (
                <div key={i} className="text-xs">
                  <p className="font-medium text-red-900">
                    Row {row.row}
                    {row.email && ` (${row.email})`}
                  </p>
                  <ul className="mt-1 ml-4 space-y-0.5 text-red-800">
                    {row.errors.map((err, j) => (
                      <li key={j} className="list-disc">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {parseResult.invalid_rows.length > 5 && (
                <p className="text-xs text-red-700 text-center py-1">
                  ... and {parseResult.invalid_rows.length - 5} more errors
                </p>
              )}
            </div>
            <button
              onClick={handleDownloadErrors}
              aria-label="Download error report"
              className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
            >
              <Download className="h-3 w-3" />
              Download error report
            </button>
          </div>
        )}

        {/* Import Status Message */}
        {parseResult.invalid_count > 0 && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Only {parseResult.valid_count} valid row(s) will be
              imported. Please fix errors and try again.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => {
              setStep('upload');
              setParseResult(null);
              setSelectedFile(null);
            }}
            aria-label="Go back to upload"
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Back
          </button>
          <button
            onClick={handleImport}
            disabled={parseResult.valid_count === 0}
            aria-label={`Import ${parseResult.valid_count} students`}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            Import {parseResult.valid_count} Student(s)
          </button>
        </div>
      </div>
    );
  }

  // Importing Step
  if (step === 'importing') {
    return (
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-600 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900">
            Importing Students...
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            {importProgress}% complete
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-200 rounded-full h-2">
          <div
            className="bg-teal-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${importProgress}%` }}
          />
        </div>

        <p className="text-center text-xs text-zinc-500">
          Please don't close this window...
        </p>
      </div>
    );
  }

  return null;
}
