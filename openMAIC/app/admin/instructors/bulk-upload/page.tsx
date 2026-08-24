'use client';

/**
 * Admin Bulk Instructor Upload
 * Upload CSV file to bulk import instructors
 */

import { useState, useRef } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('BulkInstructorUpload');

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface UploadResponse {
  uploadId: string;
  fileName: string;
  rowCount: number;
  status: string;
}

interface ResultRow {
  rowNumber: number;
  email: string;
  firstName: string;
  lastName: string;
  status: 'success' | 'failed' | 'skipped';
  actionTaken: string;
  errorMessage?: string;
  validationErrors?: string[];
  warnings?: string[];
}

interface ResultsData {
  uploadIdString: string;
  fileName: string;
  totalRows: number;
  rows: ResultRow[];
  summary: {
    successCount: number;
    failedCount: number;
    skippedCount: number;
  };
}

type ViewState = 'upload' | 'processing' | 'results';

export default function BulkUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewState, setViewState] = useState<ViewState>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [uploadStatus, setUploadStatus] = useState<any>(null);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'skipped'>('all');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please select a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be smaller than 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleDragDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input && input.files) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileSelect({ target: input } as any);
      }
    }
  };

  const downloadTemplate = () => {
    const template = 'email,first_name,last_name,cell_number,location,courses_they_teach\njohn@example.com,John,Doe,555-1234,New York,AI-101;AGILE-202\njane@example.com,Jane,Smith,555-5678,Los Angeles,AI-101';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'instructors_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/instructors/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Upload failed');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      setUploadData(data.data);
      setViewState('processing');
      setUploadProgress(100);

      // Start polling for status
      pollUploadStatus(data.data.uploadId);
    } catch (err) {
      log.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  const pollUploadStatus = async (uploadId: string) => {
    const maxAttempts = 120; // 2 minutes with 1 second interval
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/admin/instructors/bulk-upload/${uploadId}`);
        if (!response.ok) throw new Error('Failed to check status');

        const data = await response.json();
        if (!data.success) throw new Error('Failed to check status');

        setUploadStatus(data.data);

        const status = data.data.status;
        if (status === 'completed' || status === 'partial' || status === 'failed') {
          setViewState('results');
          await fetchResults(uploadId);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 1000);
        }
      } catch (err) {
        log.error('Poll error:', err);
        setError('Failed to check upload status');
      }
    };

    poll();
  };

  const fetchResults = async (uploadId: string) => {
    try {
      const response = await fetch(
        `/api/admin/instructors/bulk-upload/${uploadId}/results?limit=100`,
      );
      if (!response.ok) throw new Error('Failed to fetch results');

      const data = await response.json();
      if (!data.success) throw new Error('Failed to fetch results');

      setResultsData(data.data);
    } catch (err) {
      log.error('Results fetch error:', err);
      setError('Failed to fetch results');
    }
  };

  const resetForm = () => {
    setViewState('upload');
    setSelectedFile(null);
    setUploadData(null);
    setUploadStatus(null);
    setResultsData(null);
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const UploadView = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2
        style={{
          margin: '0 0 24px 0',
          color: BRAND_COLORS.navy,
          fontSize: '24px',
          fontWeight: '700',
        }}
      >
        Upload Instructors
      </h2>

      {/* Template Download */}
      <div
        style={{
          backgroundColor: BRAND_COLORS.light,
          border: `1px solid ${BRAND_COLORS.border}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <p
          style={{
            margin: '0 0 12px 0',
            color: BRAND_COLORS.navy,
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          CSV Format Required
        </p>
        <p
          style={{
            margin: '0 0 12px 0',
            color: BRAND_COLORS.gray,
            fontSize: '13px',
          }}
        >
          Your CSV must include these columns: email, first_name, last_name
        </p>
        <p
          style={{
            margin: '0 0 12px 0',
            color: BRAND_COLORS.gray,
            fontSize: '13px',
          }}
        >
          Optional columns: cell_number, location, courses_they_teach (semicolon-separated)
        </p>
        <button
          onClick={downloadTemplate}
          style={{
            backgroundColor: BRAND_COLORS.white,
            color: BRAND_COLORS.teal,
            border: `1px solid ${BRAND_COLORS.teal}`,
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          ↓ Download Template
        </button>
      </div>

      {/* File Upload */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDragDrop}
        style={{
          backgroundColor: selectedFile ? BRAND_COLORS.light : BRAND_COLORS.white,
          border: `2px dashed ${selectedFile ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
          borderRadius: '8px',
          padding: '40px 24px',
          textAlign: 'center',
          marginBottom: '24px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <p
          style={{
            margin: '0 0 8px 0',
            color: BRAND_COLORS.navy,
            fontSize: '16px',
            fontWeight: '600',
          }}
        >
          {selectedFile ? '✓ File Selected' : 'Drag CSV here or click to browse'}
        </p>
        <p
          style={{
            margin: '0',
            color: BRAND_COLORS.gray,
            fontSize: '13px',
          }}
        >
          {selectedFile ? selectedFile.name : 'Maximum 5MB • CSV format only'}
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            color: '#DC2626',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            flex: 1,
            backgroundColor: BRAND_COLORS.teal,
            color: BRAND_COLORS.white,
            border: 'none',
            borderRadius: '4px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
            opacity: uploading || !selectedFile ? 0.6 : 1,
          }}
        >
          {uploading ? `Uploading... ${uploadProgress}%` : 'Upload'}
        </button>
        <button
          onClick={() => setSelectedFile(null)}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            color: BRAND_COLORS.gray,
            border: `1px solid ${BRAND_COLORS.border}`,
            borderRadius: '4px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );

  const ProcessingView = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <div
        style={{
          backgroundColor: BRAND_COLORS.light,
          borderRadius: '8px',
          padding: '40px 24px',
          marginBottom: '24px',
        }}
      >
        <p
          style={{
            margin: '0 0 16px 0',
            color: BRAND_COLORS.navy,
            fontSize: '18px',
            fontWeight: '600',
          }}
        >
          Processing Upload
        </p>
        <p
          style={{
            margin: '0 0 24px 0',
            color: BRAND_COLORS.gray,
            fontSize: '14px',
          }}
        >
          {uploadData?.fileName} • {uploadData?.rowCount} rows
        </p>

        {/* Progress Bar */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.border,
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '16px',
            height: '8px',
          }}
        >
          <div
            style={{
              backgroundColor: BRAND_COLORS.teal,
              height: '100%',
              width: `${uploadProgress}%`,
              transition: 'width 0.3s',
            }}
          />
        </div>

        {uploadStatus && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginTop: '24px',
            }}
          >
            <div>
              <p style={{ margin: '0 0 4px 0', color: BRAND_COLORS.gray, fontSize: '12px' }}>
                Processed
              </p>
              <p style={{ margin: '0', color: BRAND_COLORS.navy, fontSize: '16px', fontWeight: '700' }}>
                {uploadStatus.processedRowCount} / {uploadStatus.rowCount}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: BRAND_COLORS.gray, fontSize: '12px' }}>
                Successful
              </p>
              <p
                style={{
                  margin: '0',
                  color: BRAND_COLORS.teal,
                  fontSize: '16px',
                  fontWeight: '700',
                }}
              >
                {uploadStatus.successfulRowCount}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: BRAND_COLORS.gray, fontSize: '12px' }}>
                Failed
              </p>
              <p
                style={{
                  margin: '0',
                  color: BRAND_COLORS.orange,
                  fontSize: '16px',
                  fontWeight: '700',
                }}
              >
                {uploadStatus.failedRowCount}
              </p>
            </div>
          </div>
        )}

        <p style={{ margin: '24px 0 0 0', color: BRAND_COLORS.gray, fontSize: '13px' }}>
          ⏳ Processing... This may take a few moments.
        </p>
      </div>
    </div>
  );

  const ResultsView = () => {
    if (!resultsData) return null;

    const filteredRows = resultsData.rows.filter(
      (row) => filterStatus === 'all' || row.status === filterStatus,
    );

    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2
          style={{
            margin: '0 0 24px 0',
            color: BRAND_COLORS.navy,
            fontSize: '24px',
            fontWeight: '700',
          }}
        >
          Upload Complete
        </h2>

        {/* Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              backgroundColor: BRAND_COLORS.white,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${BRAND_COLORS.border}`,
            }}
          >
            <p
              style={{
                margin: '0 0 8px 0',
                color: BRAND_COLORS.gray,
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              ✓ Successful
            </p>
            <p
              style={{
                margin: '0',
                color: BRAND_COLORS.teal,
                fontSize: '28px',
                fontWeight: '700',
              }}
            >
              {resultsData.summary.successCount}
            </p>
          </div>

          <div
            style={{
              backgroundColor: BRAND_COLORS.white,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${BRAND_COLORS.border}`,
            }}
          >
            <p
              style={{
                margin: '0 0 8px 0',
                color: BRAND_COLORS.gray,
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              ✗ Failed
            </p>
            <p
              style={{
                margin: '0',
                color: BRAND_COLORS.orange,
                fontSize: '28px',
                fontWeight: '700',
              }}
            >
              {resultsData.summary.failedCount}
            </p>
          </div>

          <div
            style={{
              backgroundColor: BRAND_COLORS.white,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${BRAND_COLORS.border}`,
            }}
          >
            <p
              style={{
                margin: '0 0 8px 0',
                color: BRAND_COLORS.gray,
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              ⊝ Skipped
            </p>
            <p
              style={{
                margin: '0',
                color: BRAND_COLORS.gray,
                fontSize: '28px',
                fontWeight: '700',
              }}
            >
              {resultsData.summary.skippedCount}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            borderBottom: `2px solid ${BRAND_COLORS.border}`,
          }}
        >
          {(['all', 'success', 'failed', 'skipped'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                backgroundColor:
                  filterStatus === status ? BRAND_COLORS.teal : 'transparent',
                color:
                  filterStatus === status ? BRAND_COLORS.white : BRAND_COLORS.gray,
                border: 'none',
                borderBottom:
                  filterStatus === status
                    ? `3px solid ${BRAND_COLORS.teal}`
                    : 'none',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>

        {/* Results Table */}
        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            borderRadius: '8px',
            border: `1px solid ${BRAND_COLORS.border}`,
            overflow: 'hidden',
            marginBottom: '24px',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: BRAND_COLORS.light,
                  borderBottom: `2px solid ${BRAND_COLORS.border}`,
                }}
              >
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                  }}
                >
                  Row
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                  }}
                >
                  Action
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: BRAND_COLORS.navy,
                  }}
                >
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: BRAND_COLORS.gray,
                    }}
                  >
                    No results to display
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    style={{
                      borderBottom: `1px solid ${BRAND_COLORS.border}`,
                      backgroundColor:
                        row.status === 'failed' ? '#FEE2E2' : 'transparent',
                    }}
                  >
                    <td
                      style={{
                        padding: '12px',
                        fontSize: '13px',
                        color: BRAND_COLORS.gray,
                      }}
                    >
                      {row.rowNumber}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        fontSize: '13px',
                        color: BRAND_COLORS.navy,
                        fontWeight: '500',
                      }}
                    >
                      {row.email}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        fontSize: '13px',
                        color: BRAND_COLORS.gray,
                      }}
                    >
                      {row.firstName} {row.lastName}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        fontSize: '13px',
                        color:
                          row.status === 'success'
                            ? BRAND_COLORS.teal
                            : row.status === 'failed'
                              ? '#DC2626'
                              : BRAND_COLORS.gray,
                        fontWeight: '600',
                      }}
                    >
                      {row.status}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        fontSize: '13px',
                        color: BRAND_COLORS.gray,
                        textTransform: 'capitalize',
                      }}
                    >
                      {row.actionTaken}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        fontSize: '12px',
                        color: BRAND_COLORS.gray,
                      }}
                    >
                      {row.errorMessage && (
                        <span style={{ color: '#DC2626' }}>{row.errorMessage}</span>
                      )}
                      {row.validationErrors && row.validationErrors.length > 0 && (
                        <div style={{ color: '#DC2626' }}>
                          {row.validationErrors.map((err, i) => (
                            <div key={i}>{err}</div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <button
          onClick={resetForm}
          style={{
            backgroundColor: BRAND_COLORS.teal,
            color: BRAND_COLORS.white,
            border: 'none',
            borderRadius: '4px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Upload Another File
        </button>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BRAND_COLORS.light,
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              margin: '0 0 8px 0',
              color: BRAND_COLORS.navy,
              fontSize: '28px',
              fontWeight: '700',
            }}
          >
            Bulk Upload Instructors
          </h1>
          <p
            style={{
              margin: '0',
              color: BRAND_COLORS.gray,
              fontSize: '14px',
            }}
          >
            Upload a CSV file to create or update multiple instructors at once
          </p>
        </div>

        {/* View Router */}
        {viewState === 'upload' && <UploadView />}
        {viewState === 'processing' && <ProcessingView />}
        {viewState === 'results' && <ResultsView />}
      </div>
    </div>
  );
}
