/**
 * Development helper: Set test instructor session
 * Only works in development mode (NODE_ENV !== 'production')
 */

export async function setTestInstructorSession(options?: {
  id?: string;
  email?: string;
}): Promise<{ success: boolean; message: string; instructor?: { id: string; email: string } }> {
  if (typeof window === 'undefined') {
    throw new Error('setTestInstructorSession must be called from browser');
  }

  try {
    const response = await fetch('/api/auth/test-instructor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: options?.id || 'test-instructor-001',
        email: options?.email || 'test.instructor@example.com',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Test instructor session set:', data.instructor);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to set test instructor session:', message);
    throw error;
  }
}

export async function clearTestInstructorSession(): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined') {
    throw new Error('clearTestInstructorSession must be called from browser');
  }

  try {
    const response = await fetch('/api/auth/test-instructor', {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Test instructor session cleared');
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to clear test instructor session:', message);
    throw error;
  }
}
