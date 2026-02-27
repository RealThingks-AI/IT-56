import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppUser {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  email: string;
  role: string | null;
  status: string | null;
}

/**
 * Fetch all active users in the system.
 * Single-company use — no org filtering needed.
 */
export function useUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["app-users"],
    queryFn: async (): Promise<AppUser[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("users")
        .select("id, auth_user_id, name, email, role, status")
        .eq("status", "active")
        .order("name");

      if (error) {
        console.error("Failed to fetch users:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

