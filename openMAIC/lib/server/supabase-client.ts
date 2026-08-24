/**
 * Supabase Client Factory
 * Lazy-initializes Supabase client with proper env var loading
 * Use this instead of module-level createClient() to ensure env vars are available
 */

import { createClient } from '@supabase/supabase-js';

let supabase: any | null = null;

export function getSupabaseClient(): any {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!url || !key) {
      throw new Error('Missing Supabase credentials in .env.local: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}
