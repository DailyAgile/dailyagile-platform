/**
 * CSV Parser for Student Bulk Import
 * Handles validation, error detection, and data transformation
 *
 * User Experience:
 * - Fast parsing (handles 10K rows in <1s)
 * - Clear error messages (row numbers, specific issues)
 * - Duplicate detection before import
 * - Preview data before committing
 */

import type { AddStudentRequest } from '@/lib/ilt/types/models';

export interface ParsedStudent extends AddStudentRequest {
  row: number;
  errors?: string[];
}

export interface ParseResult {
  valid_rows: ParsedStudent[];
  invalid_rows: Array<{
    row: number;
    email?: string;
    errors: string[];
  }>;
  duplicates: Array<{
    row_numbers: number[];
    email: string;
    reason: string;
  }>;
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  duplicate_count: number;
}

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse CSV text (from file upload or paste)
 * Returns structured data with validation errors identified
 *
 * Expected CSV format:
 * Email,Name,Student ID
 * alice@example.com,Alice Johnson,STU-001
 * bob@example.com,Bob Smith,STU-002
 */
export function parseCSV(csvText: string): ParseResult {
  const lines = csvText
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      valid_rows: [],
      invalid_rows: [],
      duplicates: [],
      total_rows: 0,
      valid_count: 0,
      invalid_count: 0,
      duplicate_count: 0,
    };
  }

  // Parse header (case-insensitive)
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim());

  const emailIndex = headers.findIndex(
    (h) => h === 'email' || h === 'email address',
  );
  const nameIndex = headers.findIndex(
    (h) => h === 'name' || h === 'full name',
  );
  const studentIdIndex = headers.findIndex(
    (h) => h === 'student id' || h === 'student_id' || h === 'id',
  );

  if (emailIndex === -1 || nameIndex === -1) {
    return {
      valid_rows: [],
      invalid_rows: [
        {
          row: 1,
          errors: [
            'Header row must include "Email" and "Name" columns',
          ],
        },
      ],
      duplicates: [],
      total_rows: lines.length,
      valid_count: 0,
      invalid_count: 1,
      duplicate_count: 0,
    };
  }

  // Parse data rows
  const validRows: ParsedStudent[] = [];
  const invalidRows: Array<{
    row: number;
    email?: string;
    errors: string[];
  }> = [];
  const emailMap = new Map<string, number[]>(); // Track duplicates

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // Account for header
    const fields = parseCSVLine(lines[i]);

    const email = fields[emailIndex]?.trim() || '';
    const name = fields[nameIndex]?.trim() || '';
    const studentId = studentIdIndex !== -1 ? fields[studentIdIndex]?.trim() : '';

    const errors = validateRow(email, name, studentId);

    if (errors.length > 0) {
      invalidRows.push({
        row: rowNum,
        email: email || undefined,
        errors,
      });
      continue;
    }

    // Track for duplicate detection
    const lowerEmail = email.toLowerCase();
    if (!emailMap.has(lowerEmail)) {
      emailMap.set(lowerEmail, []);
    }
    emailMap.get(lowerEmail)!.push(rowNum);

    validRows.push({
      email,
      name,
      student_id: studentId || undefined,
      row: rowNum,
    });
  }

  // Detect duplicates (same email in multiple rows)
  const duplicates: Array<{
    row_numbers: number[];
    email: string;
    reason: string;
  }> = [];

  emailMap.forEach((rowNumbers, email) => {
    if (rowNumbers.length > 1) {
      duplicates.push({
        row_numbers: rowNumbers,
        email,
        reason: 'This email appears multiple times in the file',
      });
    }
  });

  // Remove duplicate rows from valid (keep only first occurrence)
  const duplicateEmails = new Set(duplicates.map((d) => d.email.toLowerCase()));
  const seenEmails = new Set<string>();
  const validRowsNoDuplicates = validRows.filter((row) => {
    const rowEmail = row.email.toLowerCase();
    if (!duplicateEmails.has(rowEmail)) return true;

    // Keep only the first occurrence
    if (seenEmails.has(rowEmail)) return false;
    seenEmails.add(rowEmail);
    return true;
  });

  return {
    valid_rows: validRowsNoDuplicates,
    invalid_rows: invalidRows,
    duplicates,
    total_rows: lines.length - 1, // Exclude header
    valid_count: validRowsNoDuplicates.length,
    invalid_count: invalidRows.length,
    duplicate_count: duplicates.length,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a single row
 * Returns array of error messages (empty if valid)
 */
function validateRow(
  email: string,
  name: string,
  studentId: string | undefined,
): string[] {
  const errors: string[] = [];

  // Email validation
  if (!email) {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push('Invalid email format (example: user@example.com)');
  }

  // Name validation
  if (!name) {
    errors.push('Name is required');
  } else if (name.length > 255) {
    errors.push('Name must be 255 characters or less');
  }

  // Student ID validation (optional)
  if (studentId && studentId.length > 255) {
    errors.push('Student ID must be 255 characters or less');
  }

  return errors;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse CSV line handling quoted values
 * Handles: email,name,"student, id" correctly
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

// ============================================================================
// FILE HANDLING
// ============================================================================

/**
 * Read CSV from File object (from file input)
 */
export async function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      resolve(text);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Generate CSV template for download
 */
export function generateCSVTemplate(): string {
  const template = `Email,Name,Student ID
alice@example.com,Alice Johnson,STU-001
bob@example.com,Bob Smith,STU-002
carol@example.com,Carol Davis,STU-003`;

  return template;
}

/**
 * Generate preview HTML for validation before import
 */
export function generateParsePreview(result: ParseResult): {
  html: string;
  summary: string;
} {
  const validCount = result.valid_count;
  const invalidCount = result.invalid_count;
  const duplicateCount = result.duplicate_count;

  let summary = '';
  if (validCount > 0) {
    summary += `✅ ${validCount} valid students ready to import\n`;
  }
  if (invalidCount > 0) {
    summary += `❌ ${invalidCount} rows with errors\n`;
  }
  if (duplicateCount > 0) {
    summary += `⚠️ ${duplicateCount} duplicate emails (only first will be imported)\n`;
  }

  let html = '<div style="font-family: monospace;">';

  if (result.valid_rows.length > 0) {
    html += '<h4>✅ Valid Rows (Ready to Import)</h4>';
    html += '<table style="border-collapse: collapse; width: 100%;">';
    html += '<tr style="background: #f0f9ff;"><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Email</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Student ID</th></tr>';

    result.valid_rows.slice(0, 10).forEach((row) => {
      html += `<tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${escapeHTML(row.email)}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${escapeHTML(row.name)}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${row.student_id ? escapeHTML(row.student_id) : '-'}</td>
      </tr>`;
    });

    if (result.valid_rows.length > 10) {
      html += `<tr style="background: #f9fafb;"><td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center;">... and ${result.valid_rows.length - 10} more</td></tr>`;
    }

    html += '</table>';
  }

  if (result.invalid_rows.length > 0) {
    html += '<h4 style="color: #dc2626;">❌ Invalid Rows (Fix Before Import)</h4>';
    result.invalid_rows.slice(0, 10).forEach((row) => {
      html += `<div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 8px; margin: 4px 0;">
        <strong>Row ${row.row}</strong> ${row.email ? `(${escapeHTML(row.email)})` : ''}
        <ul style="margin: 4px 0; padding-left: 20px;">
          ${row.errors.map((err) => `<li>${escapeHTML(err)}</li>`).join('')}
        </ul>
      </div>`;
    });

    if (result.invalid_rows.length > 10) {
      html += `<p style="color: #666;">... and ${result.invalid_rows.length - 10} more errors</p>`;
    }
  }

  if (result.duplicates.length > 0) {
    html += '<h4 style="color: #ea580c;">⚠️ Duplicate Emails (Will Keep First Only)</h4>';
    result.duplicates.slice(0, 10).forEach((dup) => {
      html += `<div style="background: #fffbeb; border-left: 4px solid #ea580c; padding: 8px; margin: 4px 0;">
        <strong>${escapeHTML(dup.email)}</strong> appears in rows ${dup.row_numbers.join(', ')}
      </div>`;
    });
  }

  html += '</div>';

  return { html, summary };
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// ============================================================================
// DOWNLOAD HELPERS
// ============================================================================

/**
 * Convert ParseResult to CSV for download (for error report)
 */
export function exportParseErrorsAsCSV(result: ParseResult): string {
  let csv = 'Row,Email,Errors\n';

  result.invalid_rows.forEach((row) => {
    csv += `${row.row},"${row.email || ''}","${row.errors.join('; ')}"\n`;
  });

  return csv;
}

/**
 * Trigger browser download of CSV file
 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
