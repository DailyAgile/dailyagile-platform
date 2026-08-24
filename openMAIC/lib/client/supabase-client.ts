/**
 * Browser-Side Supabase Client
 * Used in client components for auth and real-time subscriptions
 */

import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient must be called from browser');
  }

  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!url || !key) {
      throw new Error('Missing Supabase public credentials in .env.local');
    }

    supabase = createClient(url, key);
  }

  return supabase;
}
