import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SessionUser = { id: string; email: string } | null;

/** Client-side session state for header/avatar affordances. Server code always re-validates. */
export function useSession() {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? "" } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
