import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/server/route-guards';
import { requireInstructor } from '@/lib/server/auth-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface MessagesResponse {
  success: boolean;
  data?: {
    messages: Array<{
      id: string;
      message_type: string;
      subject: string;
      body: string;
      recipient_type: string;
      recipient_count: number;
      status: string;
      sent_at: string | null;
      created_at: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<MessagesResponse>> {
  try {
    // Instructor identity from the session cookie or bearer token (see requireInstructor)
    const user = await authorize(request, requireInstructor);
    if (user instanceof NextResponse) return user as NextResponse<MessagesResponse>;

    // Get pagination params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await supabase
      .from('instructor_messages')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', user.email);

    const total = count || 0;

    // Get messages for this instructor
    const { data, error } = await supabase
      .from('instructor_messages')
      .select(
        'id, message_type, subject, body, recipient_type, recipient_count, status, sent_at, created_at'
      )
      .eq('instructor_id', user.email)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    const messages = data || [];
    const pages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          messages: messages.map((msg) => ({
            id: msg.id,
            message_type: msg.message_type,
            subject: msg.subject,
            body: msg.body,
            recipient_type: msg.recipient_type,
            recipient_count: msg.recipient_count,
            status: msg.status,
            sent_at: msg.sent_at,
            created_at: msg.created_at,
          })),
          pagination: {
            total,
            page,
            limit,
            pages,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get messages error:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
