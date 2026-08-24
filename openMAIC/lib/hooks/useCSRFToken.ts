/**
 * useCSRFToken Hook
 * Client-side hook to get CSRF token from cookie and provide helper for fetch requests
 *
 * Usage in React components:
 *   const { token, fetchWithCSRF } = useCSRFToken();
 *
 *   // Option 1: Use the fetch wrapper
 *   const response = await fetchWithCSRF('/api/quiz', {
 *     method: 'POST',
 *     body: JSON.stringify({ title: 'My Quiz' }),
 *   });
 *
 *   // Option 2: Use token manually for form submissions
 *   <input type="hidden" name="csrf_token" value={token} />
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('useCSRFToken');

export interface FetchOptions extends RequestInit {
  method?: 'POST' | 'PATCH' | 'DELETE' | 'PUT';
}

export interface UseCsrfTokenResult {
  token: string | null;
  isLoading: boolean;
  fetchWithCSRF: <T = unknown>(
    url: string,
    options?: FetchOptions,
  ) => Promise<T>;
}

/**
 * Hook to handle CSRF token for fetch requests
 */
export function useCSRFToken(): UseCsrfTokenResult {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get CSRF token from cookie on mount
  useEffect(() => {
    const getCookie = (name: string): string | null => {
      const nameEQ = name + '=';
      const cookies = document.cookie.split(';');

      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
          return cookie.substring(nameEQ.length);
        }
      }

      return null;
    };

    try {
      const csrfToken = getCookie('csrf-token');
      setToken(csrfToken);

      if (!csrfToken) {
        log.warn('CSRF token not found in cookies');
      }
    } catch (error) {
      log.error('Failed to read CSRF token:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Wrapper around fetch to include CSRF token
  const fetchWithCSRF = useCallback(
    async <T = unknown,>(url: string, options?: FetchOptions): Promise<T> => {
      if (!token) {
        throw new Error('CSRF token not available');
      }

      const headersToSend: Record<string, string> = {
        'X-CSRF-Token': token,
      };

      // Add existing headers
      if (options?.headers) {
        if (typeof options.headers === 'object' && !Array.isArray(options.headers)) {
          Object.assign(headersToSend, options.headers as Record<string, string>);
        }
      }

      // Ensure Content-Type is set for JSON requests
      if (options?.body && typeof options.body === 'string') {
        if (!headersToSend['content-type'] && !headersToSend['Content-Type']) {
          headersToSend['Content-Type'] = 'application/json';
        }
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers: headersToSend,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(
            errorData?.error?.message ||
              errorData?.message ||
              `HTTP ${response.status}`,
          );
          (error as any).status = response.status;
          (error as any).data = errorData;
          throw error;
        }

        return await response.json();
      } catch (error) {
        log.error(`Fetch error for ${url}:`, error);
        throw error;
      }
    },
    [token],
  );

  return {
    token,
    isLoading,
    fetchWithCSRF,
  };
}

/**
 * Helper to add CSRF token to form data
 * Usage: formData.append('csrf_token', token);
 */
export function getCsrfTokenFromCookie(): string | null {
  const nameEQ = 'csrf-token=';
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length);
    }
  }

  return null;
}
