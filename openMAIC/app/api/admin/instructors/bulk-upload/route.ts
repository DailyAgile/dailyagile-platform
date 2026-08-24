/**
 * POST /api/admin/instructors/bulk-upload
 * Accept CSV file with instructor data and queue for processing
 * REQUIRES: Admin authentication
 *
 * Body: FormData with 'file' field containing CSV
 * CSV Headers: email, first_name, last_name, cell_number, location, courses_they_teach
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     uploadId: string,
 *     fileName: string,
 *     rowCount: number,
 *     status: 'pending',
 *     created_at: string
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireAdmin, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { randomUUID, createHash } from 'crypto';

const log = createLogger('BulkInstructorUpload');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel'];

interface CSVRow {
  email?: string;
  first_name?: string;
  last_name?: string;
  cell_number?: string;
  location?: string;
  courses_they_teach?: string;
  [key: string]: string | undefined;
}

/**
 * Parse CSV file and extract rows
 */
function parseCSV(csvContent: string): { headers: string[]; rows: CSVRow[] } {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have headers and at least one data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  // Validate required headers
  const requiredHeaders = ['email', 'first_name', 'last_name'];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = line.split(',').map((v) => v.trim());
    const row: CSVRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error('CSV file has no data rows');
  }

  return { headers, rows };
}

/**
 * Convert CSV rows to normalized JSONB format
 */
function normalizeRows(rows: CSVRow[]): Array<{ raw_data: any }> {
  return rows.map((row) => {
    // Parse courses_they_teach if it's a JSON array or semicolon-separated list
    let courses = [];
    if (row.courses_they_teach) {
      if (row.courses_they_teach.startsWith('[')) {
        try {
          courses = JSON.parse(row.courses_they_teach);
        } catch {
          courses = row.courses_they_teach.split(';').map((c) => c.trim());
        }
      } else {
        courses = row.courses_they_teach.split(';').map((c) => c.trim());
      }
    }

    return {
      raw_data: {
        email: row.email || '',
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        cell_number: row.cell_number || null,
        location: row.location || null,
        phone_number: null,
        courses_they_teach: courses,
      },
    };
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify admin is logged in
    let authenticatedAdmin;
    try {
      authenticatedAdmin = await requireAdmin(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'file is required');
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.endsWith('.csv')) {
      return apiError('INVALID_REQUEST', 400, 'Only CSV files are allowed');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return apiError(
        'INVALID_REQUEST',
        400,
        `File must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Read and parse CSV
    let csvContent;
    try {
      csvContent = await file.text();
    } catch (error) {
      log.error('Failed to read file:', error);
      return apiError('INVALID_REQUEST', 400, 'Failed to read file');
    }

    let parsedData;
    try {
      parsedData = parseCSV(csvContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse CSV';
      log.error('CSV parse error:', error);
      return apiError('INVALID_REQUEST', 400, message);
    }

    // Normalize rows
    const normalizedRows = normalizeRows(parsedData.rows);

    const supabase = getSupabaseClient();
    const uploadId = randomUUID();
    const fileHash = createHash('md5').update(csvContent).digest('hex');

    // Create upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('instructor_bulk_uploads')
      .insert({
        id: uploadId,
        upload_id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        uploaded_by_email: authenticatedAdmin.email,
        uploaded_by_user_id: authenticatedAdmin.id,
        file_name: file.name,
        file_size_bytes: file.size,
        file_hash: fileHash,
        row_count: normalizedRows.length,
        status: 'pending',
      })
      .select('id, upload_id, status, created_at')
      .single();

    if (uploadError) {
      log.error('Failed to create upload record:', uploadError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to create upload record');
    }

    // Insert rows for processing
    const rowsToInsert = normalizedRows.map((item, index) => ({
      upload_id: uploadId,
      row_number: index + 1,
      raw_data: item.raw_data,
      status: 'pending',
    }));

    const { error: rowsError } = await supabase
      .from('instructor_bulk_upload_rows')
      .insert(rowsToInsert);

    if (rowsError) {
      log.error('Failed to insert rows:', rowsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to store CSV rows');
    }

    // Call the processing function asynchronously (in background)
    try {
      const { data: processResult } = await supabase.rpc('process_instructor_bulk_upload', {
        p_upload_id: uploadId,
      });
      log.info(`✅ Bulk upload processing initiated: ${uploadRecord.upload_id}`);
    } catch (error) {
      log.warn('Failed to auto-process in background (may process later):', error);
    }

    return apiSuccess({
      success: true,
      data: {
        uploadId: uploadRecord.id,
        upload_id: uploadRecord.upload_id,
        fileName: file.name,
        rowCount: normalizedRows.length,
        status: uploadRecord.status,
        created_at: uploadRecord.created_at,
      },
    });
  } catch (error) {
    log.error('Error uploading file:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to process upload');
  }
}
