'use client';

/**
 * DEPRECATED: Quiz Portal Redirect
 * Old page for browsing all available quizzes
 * REPLACED by assignment-based system (/learn/assignments)
 * This page now redirects students to "My Assignments"
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizzesPageRedirect');

export default function StudentQuizzesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new assignments page
    log.info('Redirecting from old /learn/quizzes to new /learn/assignments');
    router.replace('/learn/assignments');
  }, [router]);

  // Show loading while redirecting
  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <p>Redirecting to My Assignments...</p>
    </div>
  );
}
