import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useAuth(options?: { redirectOnUnauthenticated?: boolean; redirectPath?: string }) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isAuthenticated = useMemo(() => !!user, [user]);

  useEffect(() => {
    if (!loading && redirectOnUnauthenticated && !isAuthenticated) {
      window.location.href = redirectPath;
    }
  }, [loading, redirectOnUnauthenticated, isAuthenticated, redirectPath]);

  return { user, loading, isAuthenticated, logout };
}
