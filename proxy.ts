import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() reads the JWT from cookies without a network round-trip — fast.
  // This is an optimistic check: it protects routes from casual access but does not
  // re-verify the token with the Supabase server. Actual authorization happens inside
  // each Server Action via getUser(), which IS verified server-side.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const isAdminRoute   = pathname.startsWith('/admin');
  const isPartnerRoute = pathname.startsWith('/partner');

  // Role is cached in a short-lived cookie to avoid a DB query on every request.
  let role: string | null = null;
  if (user && (isAdminRoute || isPartnerRoute)) {
    const cachedRole = request.cookies.get('x-role-cache')?.value ?? null;
    if (cachedRole) {
      role = cachedRole;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = (profile?.role as string | null) ?? null;
      if (role) {
        // Cache for 5 minutes — sign-out clears all cookies anyway
        response.cookies.set('x-role-cache', role, { maxAge: 300, path: '/', httpOnly: true, sameSite: 'lax' });
      }
    }
  }

  // Clear stale role cache when there is no session
  if (!user) {
    response.cookies.delete('x-role-cache');
  }

  // Server Actions are POST requests with a Next-Action header.
  // They handle their own auth internally — redirecting them causes
  // "An unexpected response was received from the server" on the client.
  const isServerAction = request.method === 'POST' && request.headers.has('next-action');

  // Unauthenticated access to protected routes
  if (!isServerAction && (isAdminRoute || isPartnerRoute)) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (isPartnerRoute && role !== 'partner' && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
