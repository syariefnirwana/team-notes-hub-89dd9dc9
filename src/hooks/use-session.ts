import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user: (session?.user ?? null) as User | null, loading };
}

export function useMyProfile() {
  const { user } = useSession();

  return useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (rolesRes.error) throw rolesRes.error;

      return {
        profile: profileRes.data,
        isAdmin: (rolesRes.data ?? []).some((r) => r.role === "admin"),
      };
    },
  });
}
