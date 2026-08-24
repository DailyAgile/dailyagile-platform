/**
 * API: Bulk Import Students from CSV
 * POST: Upload and import CSV file with students
 *
 * User Experience:
 * - Parse and validate before importing
 * - Atomic operation (all or nothing)
 * - Detailed error reporting (row-by-row)
 * - Progress feedback for large imports
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseCSV, readCSVFile } from '@/lib/ilt/parsing/csv-parser';
import { bulkAddStudents } from '@/lib/ilt/db/students';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import type { AddStudentRequest } from '@/lib/ilt/types/models';

// ============================================================================
// ERROR HELPERS
// ============================================================================

function errorResponse(code: string, message: string, status: number = 400, details?: unknown) {
  const errorObj: any = { code, message };
  if (details) {
    errorObj.details = details;
  }
  return NextResponse.json(
    { error: errorObj },
    { status },
  );
}

function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.split('Bearer ')[1];
  if (!token) {
    throw new Error('Missing authorization header');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  );

  const {
    data: { user },
    error,
  } = await getSupabaseClient().auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return user;
}

// ============================================================================
// POST: Upload and Parse CSV (Two-Step: Validate then Import)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> },
) {
  const { classroomId } = await params;
  try {
    const user = await getAuthUser(request);

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const step = formData.get('step') as string | null; // 'validate' or 'import'

    if (!file) {
      return errorResponse('MISSING_FILE', 'No CSV file provided', 400);
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return errorResponse('INVALID_FILE_TYPE', 'Please upload a CSV file', 400);
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse('FILE_TOO_LARGE', 'File must be smaller than 10MB', 413);
    }

    // Read and parse CSV
    const csvText = await readCSVFile(file);
    const parseResult = parseCSV(csvText);

    // ========================================================================
    // STEP 1: VALIDATE (return preview, don't import yet)
    // ========================================================================
    if (step === 'validate' || !step) {
      return successResponse(
        {
          step: 'validate',
          preview: {
            valid_count: parseResult.valid_count,
            invalid_count: parseResult.invalid_count,
            duplicate_count: parseResult.duplicate_count,
            total_rows: parseResult.total_rows,
            sample_valid: parseResult.valid_rows.slice(0, 5),
            sample_invalid: parseResult.invalid_rows.slice(0, 5),
            sample_duplicates: parseResult.duplicates.slice(0, 5),
          },
          message: `Ready to import ${parseResult.valid_count} students. ${
            parseResult.invalid_count > 0 ? `${parseResult.invalid_count} rows have errors.` : ''
          }`,
        },
        200,
      );
    }

    // ========================================================================
    // STEP 2: IMPORT (after user confirms preview)
    // ========================================================================
    if (step === 'import') {
      // Validate that there are valid rows
      if (parseResult.valid_count === 0) {
        return errorResponse(
          'NO_VALID_ROWS',
          'No valid students to import. Please fix errors and try again.',
          400,
        );
      }

      // Perform bulk import
      const result = await bulkAddStudents(
        classroomId,
        parseResult.valid_rows as AddStudentRequest[],
        user.id,
      );

      // Log the bulk import action
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      );

      await getSupabaseClient()
        .from('audit_logs')
        .insert({
          classroom_id: classroomId,
          actor_id: user.id,
          action: 'bulk_import_students',
          resource_type: 'classroom',
          resource_id: classroomId,
          details: {
            imported: result.imported,
            failed: result.failed,
            file_name: file.name,
          },
        })
        .select();

      return successResponse(
        {
          step: 'import',
          imported: result.imported,
          failed: result.failed,
          errors: result.errors,
          message:
            result.failed === 0
              ? `✅ Successfully imported ${result.imported} students!`
              : `✅ Imported ${result.imported} students. ${result.failed} failed.`,
        },
        200,
      );
    }

    return errorResponse('INVALID_STEP', "step must be 'validate' or 'import'", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process CSV';

    if (message.includes('permission')) {
      return errorResponse('FORBIDDEN', 'You do not have access to this classroom', 403);
    }

    if (message.includes('Failed to read file')) {
      return errorResponse('FILE_READ_ERROR', 'Could not read the uploaded file', 400);
    }

    console.error('[POST /classrooms/:id/students/bulk-import]', error);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
