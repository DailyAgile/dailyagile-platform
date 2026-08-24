/**
 * GET /api/admin/instructors/bulk-upload/[uploadId]/results
 * Get detailed results for each row in a bulk upload
 * REQUIRES: Admin authentication
 *
 * Query params:
 * - status?: 'success' | 'failed' | 'skipped' (default: all)
 * - limit?: number (default: 50, max: 100)
 * - offset?: number (default: 0)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     uploadId: string,
 *     fileName: string,
 *     totalRows: number,
 *     rows: [
 *       {
 *         rowNumber: number,
 *         email: string,
 *         firstName: string,
 *         lastName: string,
 *         status: 'success' | 'failed' | 'skipped',
 *         actionTaken: 'created' | 'updated' | 'skipped' | 'error',
 *         errorMessage?: string,
 *         validationErrors?: string[],
 *         warnings?: string[]
 *       }
 *     ],
 *     total: number,
 *     limit: number,
 *     offset: number,
 *     summary: {
 *       successCount: number,
 *       failedCount: number,
 *       skippedCount: number
 *     }
 *   }
 * }
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';
import { requireAdmin, handleAuthError } from '@/lib/server/auth-middleware';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { sendNotificationEmail } from '@/lib/email/send-notification';

const log = createLogger('GetUploadResults');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
): Promise<Response> {
  try {
    // 🔒 AUTHENTICATION: Verify admin is logged in
    let authenticatedAdmin;
    try {
      authenticatedAdmin = await requireAdmin(req);
    } catch (authError) {
      const { status, message } = handleAuthError(authError);
      return apiError('UNAUTHORIZED', status, message);
    }

    const { uploadId } = await params;
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    // Get upload record
    const { data: upload, error: uploadError } = await supabase
      .from('instructor_bulk_uploads')
      .select('id, upload_id, file_name, row_count, successful_row_count, failed_row_count')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) {
      log.warn(`Admin ${authenticatedAdmin.email} attempted to access non-existent upload ${uploadId}`);
      return apiError('NOT_FOUND', 404, 'Upload not found');
    }

    // Build query with optional status filter
    let query = supabase
      .from('instructor_bulk_upload_rows')
      .select('*')
      .eq('upload_id', uploadId);

    if (statusFilter && ['success', 'failed', 'skipped'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data: rows, error: rowsError } = await query
      .order('row_number', { ascending: true })
      .range(offset, offset + limit - 1);

    if (rowsError) {
      log.error('Failed to fetch upload results:', rowsError);
      return apiError('INTERNAL_ERROR', 500, 'Failed to fetch results');
    }

    // Transform rows
    const transformedRows = (rows || []).map((row: any) => ({
      rowNumber: row.row_number,
      email: row.raw_data.email || '',
      firstName: row.raw_data.first_name || '',
      lastName: row.raw_data.last_name || '',
      status: row.status,
      actionTaken: row.action_taken,
      errorMessage: row.error_message,
      validationErrors: Array.isArray(row.validation_errors) ? row.validation_errors : [],
      warnings: Array.isArray(row.validation_warnings) ? row.validation_warnings : [],
    }));

    // Get total count
    let countQuery = supabase
      .from('instructor_bulk_upload_rows')
      .select('id', { count: 'exact', head: true })
      .eq('upload_id', uploadId);

    if (statusFilter && ['success', 'failed', 'skipped'].includes(statusFilter)) {
      countQuery = countQuery.eq('status', statusFilter);
    }

    const { count: totalCount } = await countQuery;

    // Calculate summary
    const { data: successRows } = await supabase
      .from('instructor_bulk_upload_rows')
      .select('id', { count: 'exact', head: true })
      .eq('upload_id', uploadId)
      .eq('status', 'success');

    const { data: failedRows } = await supabase
      .from('instructor_bulk_upload_rows')
      .select('id', { count: 'exact', head: true })
      .eq('upload_id', uploadId)
      .eq('status', 'failed');

    const { data: skippedRows } = await supabase
      .from('instructor_bulk_upload_rows')
      .select('id', { count: 'exact', head: true })
      .eq('upload_id', uploadId)
      .eq('status', 'skipped');

    log.info(
      `Fetched results for upload ${uploadId} by admin ${authenticatedAdmin.email} - ${transformedRows.length} rows`,
    );

    // Send completion email to admin (first time they request results)
    const successCount = upload.successful_row_count || 0;
    const failedCount = upload.failed_row_count || 0;
    if ((successCount > 0 || failedCount > 0) && !statusFilter) {
      // Only send once when no filter applied (initial results check)
      try {
        await sendNotificationEmail('bulk-upload-complete', {
          email: authenticatedAdmin.email,
          adminName: authenticatedAdmin.email.split('@')[0],
          uploadId: upload.upload_id,
          rowCount: upload.row_count || 0,
          successCount,
          failureCount: failedCount,
          resultsLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dailyagile.com'}/admin/bulk-uploads/${uploadId}`,
        });
      } catch (emailError) {
        log.warn('Failed to send bulk upload completion email:', emailError);
      }
    }

    return apiSuccess({
      success: true,
      data: {
        uploadId: upload.id,
        uploadIdString: upload.upload_id,
        fileName: upload.file_name,
        totalRows: upload.row_count,
        rows: transformedRows,
        total: totalCount || 0,
        limit,
        offset,
        summary: {
          successCount: upload.successful_row_count || 0,
          failedCount: upload.failed_row_count || 0,
          skippedCount: (upload.row_count || 0) - (upload.successful_row_count || 0) - (upload.failed_row_count || 0),
        },
      },
    });
  } catch (error) {
    log.error('Error getting upload results:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to get results');
  }
}
