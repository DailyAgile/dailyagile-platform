import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('AnswerStatusAPI');

const STUDENT_ICONS = ['🎓', '⭐', '🚀', '🎯', '💡', '🏆', '🎨', '🔥', '💪', '🌟', '✨', '🎪', '🎭', '🎬', '🎸', '🎲', '⚡', '🌈', '🦁', '🎵'];

function getIconForStudent(studentId: string): string {
  const hash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return STUDENT_ICONS[hash % STUDENT_ICONS.length];
}

interface StudentStatus {
  student_id: string;
  student_name: string;
  icon: string;
  answered: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;

    if (!code || typeof code !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'Join code is required');
    }

    const supabase = getSupabaseClient();

    const { data: session, error: sessionError } = await supabase
      .from('live_quiz_sessions')
      .select('id, current_question_index')
      .eq('join_code', code)
      .single();

    if (sessionError || !session) {
      return apiError('NOT_FOUND', 404, 'Session not found');
    }

    const { data: participants } = await supabase
      .from('live_quiz_participants')
      .select('student_id, student_name')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    if (!participants) {
      return apiSuccess({
        data: {
          answered: [],
          waiting: [],
          percentage: 0,
        },
      });
    }

    const { data: responses } = await supabase
      .from('live_quiz_responses')
      .select('student_id')
      .eq('session_id', session.id)
      .eq('question_id', `q${session.current_question_index}`);

    const answeredIds = new Set(responses?.map((r) => r.student_id) || []);

    const answered: StudentStatus[] = participants
      .filter((p) => answeredIds.has(p.student_id))
      .map((p) => ({
        student_id: p.student_id,
        student_name: p.student_name || 'Anonymous',
        icon: getIconForStudent(p.student_id),
        answered: true,
      }));

    const waiting: StudentStatus[] = participants
      .filter((p) => !answeredIds.has(p.student_id))
      .map((p) => ({
        student_id: p.student_id,
        student_name: p.student_name || 'Anonymous',
        icon: getIconForStudent(p.student_id),
        answered: false,
      }));

    return apiSuccess({
      data: {
        answered,
        waiting,
        percentage: participants.length > 0
          ? Math.round((100 * answered.length) / participants.length)
          : 0,
      },
    });
  } catch (error) {
    log.error('Error retrieving answer status:', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to retrieve answer status');
  }
}
