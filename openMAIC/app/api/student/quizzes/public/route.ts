import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('PublicQuizzesAPI');

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, quiz_code, title, description, total_questions, difficulty_level')
      .eq('is_public', true)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      log.warn('Failed to fetch public quizzes:', error);
      return Response.json({ success: false, error: 'Failed to fetch quizzes' }, { status: 500 });
    }

    log.info(`Fetched ${quizzes?.length || 0} public quizzes`);

    return Response.json({
      success: true,
      quizzes: quizzes || [],
    });
  } catch (error) {
    log.error('Public quizzes API error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
