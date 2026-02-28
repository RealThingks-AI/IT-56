import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

interface LookupUser {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  email: string;
}

/**
 * Shared hook for user name resolution across asset detail tabs.
 * Fetches once and exposes a resolver that matches both `users.id` and `users.auth_user_id`.
 */
export function useUsersLookup() {
  const { data: users = [] } = useQuery({
    queryKey: ["users-lookup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, auth_user_id, name, email");
      return (data || []) as LookupUser[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const resolveUserName = useCallback(
    (userId: string | null): string | null => {
      if (!userId) return null;
      const user = users.find(
        (u) => u.id === userId || u.auth_user_id === userId
      );
      return user?.name || user?.email || null;
    },
    [users]
  );

  return { users, resolveUserName };
}
