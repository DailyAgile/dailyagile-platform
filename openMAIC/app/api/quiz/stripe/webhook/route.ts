import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseClient } from '../../../../lib/server/supabase-client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const studentEmail = session.customer_email || session.metadata?.email || '';
      const courseId = session.metadata?.course_id || '';
      const productType = session.metadata?.product_type || 'quiz';

      if (!studentEmail || !courseId) {
        console.error('Missing required metadata:', { studentEmail, courseId });
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Only process Quiz product enrollments
      if (productType !== 'quiz') {
        console.log('Skipping non-quiz product:', productType);
        return NextResponse.json({ success: true });
      }

      const supabase = getSupabaseClient();

      // Create or update student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .upsert(
          {
            email: studentEmail,
            email_verified: true,
          },
          { onConflict: 'email' }
        )
        .select()
        .single();

      if (studentError) {
        console.error('Error creating student:', studentError);
        throw studentError;
      }

      // Record purchase in billing_history
      const { error: billingError } = await supabase.from('billing_history').insert({
        student_id: student.id,
        course_id: courseId,
        amount_paid: (session.amount_total || 0) / 100, // Convert cents to dollars
        currency: session.currency?.toUpperCase() || 'USD',
        payment_method: 'stripe',
        external_invoice_id: session.id,
        status: 'completed',
      });

      if (billingError) {
        console.error('Error recording billing:', billingError);
        throw billingError;
      }

      // Send confirmation email via Brevo
      if (process.env.BREVO_API_KEY) {
        try {
          await sendBrevoEmail({
            email: studentEmail,
            courseId,
            amount: (session.amount_total || 0) / 100,
          });
        } catch (emailErr) {
          console.error('Error sending confirmation email:', emailErr);
          // Don't fail the webhook if email fails
        }
      }

      console.log('Quiz enrollment processed:', {
        studentId: student.id,
        courseId,
        email: studentEmail,
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error('Error processing webhook:', err);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  // Acknowledge other webhook events
  return NextResponse.json({ success: true });
}

async function sendBrevoEmail({
  email,
  courseId,
  amount,
}: {
  email: string;
  courseId: string;
  amount: number;
}) {
  const brevoKey = process.env.BREVO_API_KEY;
  if (!brevoKey) return;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [{ email }],
      sender: { email: 'support@dailyagile.com', name: 'DailyAgile' },
      subject: 'Quiz Course Enrollment Confirmed',
      htmlContent: `
        <h2>Welcome to DailyAgile!</h2>
        <p>Your course enrollment has been confirmed.</p>
        <p><strong>Course ID:</strong> ${courseId}</p>
        <p><strong>Amount Paid:</strong> $${amount.toFixed(2)}</p>
        <p>You can now access your course materials.</p>
        <p>Log in at: <a href="https://dailyagile.com/academy/quiz">dailyagile.com/academy/quiz</a></p>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo API error: ${response.statusText}`);
  }
}
