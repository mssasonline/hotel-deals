'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'partner' | 'user' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return 'user';
  return (data.role as UserRole) ?? 'user';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const nullUserTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Safety valve: if Supabase is unreachable, don't hang forever
    const timeout = setTimeout(() => setLoading(false), 8000);

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const r = await fetchUserRole(session.user.id);
          setRole(r);
        }
      } catch (error) {
        console.error(error);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Cancel any pending null-user timer from a previous SIGNED_OUT
      if (nullUserTimer.current) {
        clearTimeout(nullUserTimer.current);
        nullUserTimer.current = null;
      }

      try {
        if (event === 'TOKEN_REFRESHED') {
          // Same user, just new tokens — update session only to avoid re-renders
          setSession(session);
          return;
        }

        setSession(session);

        if (session?.user) {
          setUser(session.user);
          const r = await fetchUserRole(session.user.id);
          setRole(r);
        } else {
          // Debounce the null-user update: Supabase sometimes fires a transient
          // SIGNED_OUT during token refresh followed immediately by SIGNED_IN.
          // Waiting 500 ms lets the SIGNED_IN cancel this before any redirect fires.
          nullUserTimer.current = setTimeout(() => {
            setUser(null);
            setRole(null);
          }, 500);
        }
      } catch (error) {
        console.error(error);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      if (nullUserTimer.current) clearTimeout(nullUserTimer.current);
      subscription.unsubscribe();
    };
  }, []);

  // Recover after the tab/window returns from the background. Two failure modes
  // leave the Supabase client unable to reach the server until the page is
  // reloaded — which is exactly why a manual refresh fixes it:
  //   1. GoTrue's in-process auth lock deadlocks if the tab froze mid-refresh
  //      (every DB query resolves its token through getSession(), so all hang).
  //   2. HTTP keep-alive connections go stale while the app is backgrounded, so
  //      the first query hangs on a dead socket until a long TCP timeout.
  // We fire a tiny REAL network query on return (a storage-only getSession()
  // check would miss the stale-connection case). If it doesn't answer, the
  // client is stuck → reload to recreate it with fresh connections. The trigger
  // is window focus/blur, NOT just visibilitychange: switching to another app
  // or browser window keeps the page "visible", so visibilitychange never fires.
  useEffect(() => {
    let awaySince = 0;
    let probing = false;

    async function probeAndRecover() {
      if (probing) return;
      const awayMs = awaySince ? Date.now() - awaySince : 0;
      awaySince = 0;
      // Skip trivial focus flicks (address bar, devtools); only real away time
      // is long enough for connections to go stale.
      if (awayMs < 4000) return;
      probing = true;
      try {
        // A fast error still means the network answered (not stuck) → 'ok'.
        // Only a non-response (timeout) means the client is wedged/stale.
        const result = await Promise.race([
          supabase.from('platform_settings').select('key').limit(1)
            .then(() => 'ok' as const, () => 'ok' as const),
          new Promise<'stuck'>((resolve) => setTimeout(() => resolve('stuck'), 5000)),
        ]);
        if (result === 'stuck') window.location.reload();
      } finally {
        probing = false;
      }
    }

    function markAway() { if (!awaySince) awaySince = Date.now(); }

    function onVisibility() {
      if (document.visibilityState === 'hidden') markAway();
      else void probeAndRecover();
    }
    function onPageShow(e: PageTransitionEvent) {
      // Restored from the back/forward cache: the frozen client is stale.
      if (e.persisted) window.location.reload();
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', markAway);
    window.addEventListener('focus', probeAndRecover);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', markAway);
      window.removeEventListener('focus', probeAndRecover);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
