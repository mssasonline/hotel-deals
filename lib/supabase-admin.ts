import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS completely.
 * Use ONLY in Server Actions / Route Handlers. Never import on the client.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (no NEXT_PUBLIC_ prefix).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (server-side only, no NEXT_PUBLIC_ prefix).'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
