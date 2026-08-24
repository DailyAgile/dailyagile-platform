/**
 * Certificate Generator Service
 * Generates PDF certificates for completed quizzes
 */

import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('CertificateGenerator');

export interface CertificateData {
  studentName: string;
  quizTitle: string;
  completionDate: string;
  score: number;
  certificateId: string;
}

/**
 * Generate certificate data and store in database
 */
export async function generateCertificate(
  studentId: string,
  quizId: string,
  score: number,
  studentName: string,
  quizTitle: string
) {
  try {
    const supabase = getSupabaseClient();

    // Generate certificate ID
    const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const completionDate = new Date().toISOString().split('T')[0];

    // Store certificate in database
    const { data, error } = await supabase
      .from('certificates')
      .insert({
        student_id: studentId,
        quiz_id: quizId,
        certificate_id: certificateId,
        score,
        student_name: studentName,
        quiz_title: quizTitle,
        completion_date: completionDate,
        issued_at: new Date().toISOString(),
        certificate_url: `/certificates/${certificateId}.pdf`,
      })
      .select()
      .single();

    if (error) {
      log.error('Failed to generate certificate:', error);
      return null;
    }

    log.info(`Certificate generated: ${certificateId} for ${studentName}`);

    // Send certificate email notification
    try {
      const { sendNotificationEmail } = await import('@/lib/email/send-notification');
      const { data: student } = await supabase
        .from('students')
        .select('email, first_name')
        .eq('id', studentId)
        .single();

      if (student?.email) {
        await sendNotificationEmail('certificate-awarded', {
          email: student.email,
          firstName: student.first_name || 'Student',
          courseName: quizTitle,
          completionDate: new Date(completionDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          certificateLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dailyagile.com'}/certificates/${certificateId}`,
          shareLink: `https://www.linkedin.com/feed/update/urn:li:activity:${Date.now()}`,
        });
      }
    } catch (emailError) {
      log.warn('Failed to send certificate email:', emailError);
      // Continue - certificate is already generated
    }

    return data;
  } catch (error) {
    log.error('Error in generateCertificate:', error);
    return null;
  }
}

/**
 * Get student certificates
 */
export async function getStudentCertificates(studentId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', studentId)
      .order('issued_at', { ascending: false });

    if (error) {
      log.warn(`Failed to fetch certificates for student ${studentId}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error in getStudentCertificates:', error);
    return [];
  }
}

/**
 * Get certificate by ID
 */
export async function getCertificateById(certificateId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('certificate_id', certificateId)
      .single();

    if (error) {
      log.warn(`Certificate not found: ${certificateId}`);
      return null;
    }

    return data;
  } catch (error) {
    log.error('Error in getCertificateById:', error);
    return null;
  }
}
