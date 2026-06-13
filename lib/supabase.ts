import { createBrowserClient } from '@supabase/ssr';

// createBrowserClient stores the session in cookies (not localStorage)
// so the server-side proxy.ts and server components can read the session.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Tables in use:
// - hotels
// - rooms    (FK → hotels.id)
// - bookings
// - profiles (id, role)
// - deals
