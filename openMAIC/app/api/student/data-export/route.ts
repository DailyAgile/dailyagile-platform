/**
 * Student Data Export (GDPR Article 15 - Data Access Request)
 * POST /api/student/data-export
 *
 * Allows students to download all personal data we hold about them
 * Includes: profile, quiz attempts, progress, consents, preferences
 *
 * Requires:
 * - Authorization header with student ID
 * - Password confirmation (for security)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/rate-limiter';
import crypto from 'crypto';

const log = createLogger('DataExport');

// ============================================================================
// EXPORT SIZE LIMITS
// Prevents storage exhaustion and ensures reasonable export sizes
// ============================================================================
const MAX_EXPORT_SIZE_BYTES = 100 * 1024 * 1024; // 100MB max per export
const MAX_EXPORT_ROWS = 50000; // Max 50K rows to prevent infinite loops

interface DataExportRequest {
  format: 'json' | 'csv';
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DataExportRequest;
    const { format = 'json', password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to export personal data' },
        { status: 400 }
      );
    }

    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be "json" or "csv"' },
        { status: 400 }
      );
    }

    // Extract student ID from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const studentId = authHeader.substring(7); // Remove 'Bearer ' prefix

    // 🛡️ RATE LIMITING: Prevent data export abuse (3 exports per 24 hours per student)
    const rateLimitKey = `data-export:${studentId}`;
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.DATA_EXPORT.limit,
      RATE_LIMITS.DATA_EXPORT.window
    );

    if (!rateLimitResult.allowed) {
      log.warn(`Rate limit exceeded for data export: student ${studentId}`);
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: RATE_LIMITS.DATA_EXPORT.message,
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch and verify student
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('id, email, first_name, last_name, password_hash, created_at, updated_at, last_login_at')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      log.warn(`Data export request for non-existent student: ${studentId}`);
      return NextResponse.json(
        { error: 'Student account not found' },
        { status: 404 }
      );
    }

    // Verify password
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password + (process.env.PASSWORD_SALT || ''))
      .digest('hex');

    if (hashedPassword !== student.password_hash) {
      log.warn(`Failed password verification for data export: ${studentId}`);
      return NextResponse.json(
        { error: 'Invalid password. Data export cancelled.' },
        { status: 401 }
      );
    }

    // ========================================================================
    // PRE-FLIGHT CHECK: Verify row count doesn't exceed limit
    // Uses RPC function to count all rows before processing
    // ========================================================================
    const { data: rowCounts, error: countError } = await supabase.rpc(
      'count_export_rows',
      { p_student_id: studentId }
    ) as { data: Array<{ total_rows: number; quiz_submissions_count: number; quiz_answers_count: number; badges_count: number }> | null; error: any };

    if (countError) {
      log.error('Failed to count export rows:', countError);
      return NextResponse.json(
        { error: 'Unable to validate export size. Please try again.' },
        { status: 500 }
      );
    }

    const counts = rowCounts?.[0];
    if (!counts) {
      log.error('No row count data returned for export validation');
      return NextResponse.json(
        { error: 'Unable to validate export size. Please try again.' },
        { status: 500 }
      );
    }

    const totalRows = Number(counts.total_rows);
    if (totalRows > MAX_EXPORT_ROWS) {
      log.warn(
        `Data export rejected for student ${studentId}: ${totalRows} rows exceeds limit of ${MAX_EXPORT_ROWS}`
      );
      await supabase.from('privacy_audit_log').insert({
        student_id: studentId,
        event_type: 'export_rejected',
        description: `Data export rejected - exceeds row limit (${totalRows} > ${MAX_EXPORT_ROWS})`,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        user_agent: req.headers.get('user-agent') || '',
      });

      return NextResponse.json(
        {
          error: 'EXPORT_TOO_LARGE',
          message: `Your data export would contain ${totalRows} rows, which exceeds the limit of ${MAX_EXPORT_ROWS}.`,
          details: {
            quiz_submissions: counts.quiz_submissions_count,
            quiz_answers: counts.quiz_answers_count,
            badges: counts.badges_count,
            total_rows: totalRows,
            limit: MAX_EXPORT_ROWS,
          },
          suggestion: 'Your data export is too large. Please contact support@dailyagile.com for assistance with large exports.',
        },
        { status: 413 } // 413 = Payload Too Large
      );
    }

    // Fetch all student data
    const [
      { data: profile },
      { data: quizHistory },
      { data: progress },
      { data: consents },
      { data: preferences },
      { data: badges },
      { data: streaks },
    ] = await Promise.all([
      supabase.from('student_profiles').select('*').eq('student_id', studentId).single(),
      supabase.from('student_quiz_history').select('*').eq('student_id', studentId),
      supabase.from('student_progress').select('*').eq('student_id', studentId).single(),
      supabase.from('student_consents').select('*').eq('student_id', studentId),
      supabase.from('marketing_preferences').select('*').eq('student_id', studentId).single(),
      supabase.from('student_badges').select('*').eq('student_id', studentId).catch(() => ({ data: [] })),
      supabase.from('student_streaks').select('*').eq('student_id', studentId).catch(() => ({ data: [] })),
    ]);

    // Prepare export data
    const exportData = {
      export_date: new Date().toISOString(),
      account_created_at: student.created_at,
      account_updated_at: student.updated_at,
      last_login_at: student.last_login_at,
      profile: {
        id: student.id,
        email: student.email,
        first_name: student.first_name,
        last_name: student.last_name,
        additional_info: profile || {},
      },
      quiz_history: quizHistory || [],
      progress: progress || {},
      badges: badges || [],
      streaks: streaks || [],
      consents: consents || [],
      marketing_preferences: preferences || {},
      data_retention_notes: {
        quiz_history_retained_until: '3 years from attempt date (regulatory requirement)',
        audit_logs_retained_until: '7 years from creation (legal requirement)',
        account_data_retained_until: 'Until account deletion requested + 30 day grace period',
      },
    };

    // Log data export request
    await supabase.from('privacy_audit_log').insert({
      student_id: studentId,
      event_type: 'data_exported',
      description: `Data export requested (format: ${format})`,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      user_agent: req.headers.get('user-agent') || '',
    });

    // Generate response
    if (format === 'json') {
      return generateJsonResponse(exportData, student.email, studentId, supabase);
    } else {
      return generateCsvResponse(exportData, student.email, studentId, supabase);
    }
  } catch (error) {
    log.error('Unexpected error in data export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate JSON response with all data
 * Checks file size before returning to prevent storage exhaustion
 */
async function generateJsonResponse(data: any, email: string, studentId: string, supabase: any): Promise<NextResponse> {
  const filename = `dailyagile-data-export-${email.split('@')[0]}-${new Date().toISOString().split('T')[0]}.json`;
  const jsonContent = JSON.stringify(data, null, 2);

  // ========================================================================
  // POST-SERIALIZATION CHECK: Verify file size doesn't exceed limit
  // ========================================================================
  const sizeBytes = Buffer.byteLength(jsonContent, 'utf-8');
  if (sizeBytes > MAX_EXPORT_SIZE_BYTES) {
    log.warn(
      `JSON export rejected for student ${studentId}: ${sizeBytes} bytes exceeds limit of ${MAX_EXPORT_SIZE_BYTES}`
    );
    await supabase.from('privacy_audit_log').insert({
      student_id: studentId,
      event_type: 'export_rejected',
      description: `Data export rejected - exceeds size limit (${formatBytes(sizeBytes)} > ${formatBytes(MAX_EXPORT_SIZE_BYTES)})`,
      ip_address: '',
      user_agent: '',
    });

    return new NextResponse(
      JSON.stringify({
        error: 'EXPORT_TOO_LARGE',
        message: `Your data export is too large (${formatBytes(sizeBytes)}, limit: ${formatBytes(MAX_EXPORT_SIZE_BYTES)}).`,
        details: {
          size_bytes: sizeBytes,
          max_bytes: MAX_EXPORT_SIZE_BYTES,
          format: 'json',
        },
        suggestion: 'Your data export is too large. Please contact support@dailyagile.com for assistance.',
      }),
      {
        status: 413, // Payload Too Large
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  log.info(
    `JSON data export generated for student ${studentId} (${formatBytes(sizeBytes)})`
  );

  return new NextResponse(jsonContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

/**
 * Generate CSV response
 * Creates separate sheets: profile, quiz history, consents, preferences
 * Checks file size before returning to prevent storage exhaustion
 */
async function generateCsvResponse(data: any, email: string, studentId: string, supabase: any): Promise<NextResponse> {
  const csvParts: string[] = [];
  const filename = `dailyagile-data-export-${email.split('@')[0]}-${new Date().toISOString().split('T')[0]}.csv`;

  // Profile section
  csvParts.push('PROFILE DATA');
  csvParts.push('Field,Value');
  csvParts.push(`Export Date,"${data.export_date}"`);
  csvParts.push(`Email,"${data.profile.email}"`);
  csvParts.push(`Name,"${data.profile.first_name} ${data.profile.last_name}"`);
  csvParts.push(`Account Created,"${data.account_created_at}"`);
  csvParts.push(`Last Login,"${data.last_login_at}"`);
  csvParts.push('');

  // Quiz History
  csvParts.push('QUIZ HISTORY');
  csvParts.push('Quiz ID,Score,Percentage,Time Taken (seconds),Passed,Attempted At,Answers');
  data.quiz_history.forEach((q: any) => {
    const answersJson = JSON.stringify(q.answers || {}).replace(/"/g, '""');
    csvParts.push(
      `"${q.quiz_id}","${q.score}","${q.percentage}","${q.time_taken_seconds}","${q.passed}","${q.attempted_at}","${answersJson}"`
    );
  });
  csvParts.push('');

  // Progress
  if (data.progress) {
    csvParts.push('PROGRESS');
    csvParts.push('Field,Value');
    csvParts.push(`Total Quizzes Taken,"${data.progress.total_quizzes_taken}"`);
    csvParts.push(`Average Score,"${data.progress.average_score}"`);
    csvParts.push(`Streak Days,"${data.progress.streak_days}"`);
    csvParts.push(`Last Attempt,"${data.progress.last_attempt_at}"`);
    csvParts.push('');
  }

  // Badges
  if (data.badges.length > 0) {
    csvParts.push('BADGES');
    csvParts.push('Badge ID,Badge Name,Earned At');
    data.badges.forEach((b: any) => {
      csvParts.push(`"${b.id}","${b.badge_name}","${b.earned_at}"`);
    });
    csvParts.push('');
  }

  // Consents
  if (data.consents.length > 0) {
    csvParts.push('CONSENTS');
    csvParts.push('Consent Type,Given,Given At,Withdrawn At,Policy Version,IP Address');
    data.consents.forEach((c: any) => {
      csvParts.push(
        `"${c.consent_type}","${c.given}","${c.given_at}","${c.withdrawn_at}","${c.policy_version}","${c.ip_address}"`
      );
    });
    csvParts.push('');
  }

  // Preferences
  if (data.marketing_preferences) {
    csvParts.push('MARKETING & PRIVACY PREFERENCES');
    csvParts.push('Field,Value');
    csvParts.push(`Email Marketing,"${data.marketing_preferences.email_marketing}"`);
    csvParts.push(`SMS Marketing,"${data.marketing_preferences.sms_marketing}"`);
    csvParts.push(`Push Notifications,"${data.marketing_preferences.push_notifications}"`);
    csvParts.push(`Public Leaderboard,"${data.marketing_preferences.leaderboard_public}"`);
    csvParts.push(`Analytics Tracking,"${data.marketing_preferences.analytics_tracking}"`);
    csvParts.push(`Third Party Sharing,"${data.marketing_preferences.third_party_sharing}"`);
    csvParts.push('');
  }

  // Retention info
  csvParts.push('DATA RETENTION');
  csvParts.push('Category,Retention Period');
  csvParts.push('Quiz History,"3 years from attempt date (regulatory requirement)"');
  csvParts.push('Audit Logs,"7 years from creation (legal requirement)"');
  csvParts.push('Account Data,"Until deletion requested + 30 day grace period"');

  const csvContent = csvParts.join('\n');

  // ========================================================================
  // POST-SERIALIZATION CHECK: Verify file size doesn't exceed limit
  // ========================================================================
  const sizeBytes = Buffer.byteLength(csvContent, 'utf-8');
  if (sizeBytes > MAX_EXPORT_SIZE_BYTES) {
    log.warn(
      `CSV export rejected for student ${studentId}: ${sizeBytes} bytes exceeds limit of ${MAX_EXPORT_SIZE_BYTES}`
    );
    await supabase.from('privacy_audit_log').insert({
      student_id: studentId,
      event_type: 'export_rejected',
      description: `Data export rejected - exceeds size limit (${formatBytes(sizeBytes)} > ${formatBytes(MAX_EXPORT_SIZE_BYTES)})`,
      ip_address: '',
      user_agent: '',
    });

    return new NextResponse(
      JSON.stringify({
        error: 'EXPORT_TOO_LARGE',
        message: `Your data export is too large (${formatBytes(sizeBytes)}, limit: ${formatBytes(MAX_EXPORT_SIZE_BYTES)}).`,
        details: {
          size_bytes: sizeBytes,
          max_bytes: MAX_EXPORT_SIZE_BYTES,
          format: 'csv',
        },
        suggestion: 'Your data export is too large. Please contact support@dailyagile.com for assistance.',
      }),
      {
        status: 413, // Payload Too Large
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  log.info(
    `CSV data export generated for student ${studentId} (${formatBytes(sizeBytes)})`
  );

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

/**
 * Format bytes as human-readable string (KB, MB, GB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
