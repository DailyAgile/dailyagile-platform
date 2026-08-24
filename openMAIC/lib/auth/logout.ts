/**
 * Logout utilities for both instructor and student
 */

export function logoutInstructor() {
  // Clear instructor tokens and session
  localStorage.removeItem('instructorToken');
  localStorage.removeItem('token');
  localStorage.removeItem('auth_token');

  // Redirect to home/login
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
}

export function logoutStudent() {
  // Clear student tokens and session
  localStorage.removeItem('studentToken');
  localStorage.removeItem('token');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('last-login-email');

  // Redirect to home
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}

export function getCurrentInstructor() {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('instructorToken') ||
                localStorage.getItem('token') ||
                localStorage.getItem('auth_token');

  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function getCurrentStudent() {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('studentToken') ||
                localStorage.getItem('token') ||
                localStorage.getItem('auth_token');

  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
