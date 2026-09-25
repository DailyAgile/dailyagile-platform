import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Validation schema for bulk message request
const BulkMessageSchema = z.object({
  message_type: z.enum(['general', 'reminder', 'announcement']),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  recipient_type: z.enum(['individual', 'group', 'all']),
  recipient_ids: z.array(z.string()).optional(), // For individual/group
  quiz_id: z.string().uuid().optional(), // For reminder context
});

type BulkMessageRequest = z.infer<typeof BulkMessageSchema>;

interface MessageResponse {
  success: boolean;
  data?: {
    message_id: string;
    recipient_count: number;
    status: string;
    message: string;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<MessageResponse>> {
  try {
    // Get instructor from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = BulkMessageSchema.parse(body);

    // Get recipient list based on recipient_type
    let recipientStudents: Array<{ id: string; email: string }> = [];

    if (validatedData.recipient_type === 'individual') {
      if (!validatedData.recipient_ids || validatedData.recipient_ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'recipient_ids required for individual messages' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, email')
        .in('id', validatedData.recipient_ids);

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch recipients' },
          { status: 500 }
        );
      }

      recipientStudents = data || [];
    } else if (validatedData.recipient_type === 'group') {
      if (!validatedData.recipient_ids || validatedData.recipient_ids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'recipient_ids required for group messages' },
          { status: 400 }
        );
      }

      // Get students from specific quiz assignments
      const { data, error } = await supabase
        .from('quiz_assignments')
        .select('students(id, email)')
        .in('quiz_id', validatedData.recipient_ids)
        .eq('instructor_id', user.email);

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch group recipients' },
          { status: 500 }
        );
      }

      // Flatten the data structure
      const uniqueStudents = new Map<string, { id: string; email: string }>();
      (data || []).forEach((assignment: any) => {
        if (assignment.students) {
          uniqueStudents.set(assignment.students.id, assignment.students);
        }
      });

      recipientStudents = Array.from(uniqueStudents.values());
    } else if (validatedData.recipient_type === 'all') {
      // Get all students who have taken quizzes by this instructor
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('students(id, email)')
        .eq('instructor_id', user.email)
        .neq('students', null);

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch all students' },
          { status: 500 }
        );
      }

      const uniqueStudents = new Map<string, { id: string; email: string }>();
      (data || []).forEach((session: any) => {
        if (session.students) {
          uniqueStudents.set(session.students.id, session.students);
        }
      });

      recipientStudents = Array.from(uniqueStudents.values());
    }

    if (recipientStudents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recipients found' },
        { status: 400 }
      );
    }

    // Create message record
    const { data: messageData, error: messageError } = await supabase
      .from('instructor_messages')
      .insert([
        {
          instructor_id: user.email,
          quiz_id: validatedData.quiz_id || null,
          message_type: validatedData.message_type,
          subject: validatedData.subject,
          body: validatedData.body,
          recipient_type: validatedData.recipient_type,
          recipient_count: recipientStudents.length,
          status: 'sent',
          sent_at: new Date().toISOString(),
        },
      ])
      .select('id');

    if (messageError || !messageData || messageData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to create message' },
        { status: 500 }
      );
    }

    const messageId = messageData[0].id;

    // Create recipient records
    const recipientRecords = recipientStudents.map((student) => ({
      message_id: messageId,
      student_id: student.id,
      student_email: student.email,
      delivery_status: 'sent',
      delivered_at: new Date().toISOString(),
    }));

    const { error: recipientError } = await supabase
      .from('message_recipients')
      .insert(recipientRecords);

    if (recipientError) {
      console.error('Failed to create recipient records:', recipientError);
      // Don't fail the entire operation, but log it
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message_id: messageId,
          recipient_count: recipientStudents.length,
          status: 'sent',
          message: `Message sent to ${recipientStudents.length} student(s)`,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Bulk message error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: `Validation error: ${error.issues[0].message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
