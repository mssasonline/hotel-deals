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
