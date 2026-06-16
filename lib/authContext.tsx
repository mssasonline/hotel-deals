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

  // Recover from a wedged Supabase auth client after the tab returns from the
  // background. Every DB query resolves its token through auth.getSession(),
  // which acquires GoTrue's in-process lock. If the tab is frozen mid
  // token-refresh (e.g. the user left for another site and came back), that
  // lock's reentrancy guard deadlocks and getSession() never resolves — so
  // every query hangs. The only recovery is to recreate the client, which is
  // exactly what a manual page refresh does. We probe getSession() with a
  // timeout on return; if it doesn't answer, the client is wedged → reload.
  useEffect(() => {
    let recovering = false;

    async function recoverIfWedged() {
      if (recovering || document.visibilityState !== 'visible') return;
      recovering = true;
      // An error means the client *responded* (not wedged) — only a
      // non-response (timeout) indicates the deadlock.
      const result = await Promise.race([
        supabase.auth.getSession().then(() => 'ok').catch(() => 'ok'),
        new Promise<'wedged'>((resolve) => setTimeout(() => resolve('wedged'), 6000)),
      ]);
      if (result === 'wedged') {
        window.location.reload();
        return;
      }
      recovering = false;
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') void recoverIfWedged();
    }
    function onPageShow(e: PageTransitionEvent) {
      // Restored from the back/forward cache: the frozen client is stale.
      if (e.persisted) window.location.reload();
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
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
