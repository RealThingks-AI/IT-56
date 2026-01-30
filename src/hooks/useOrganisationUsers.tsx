import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OrganisationUser {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  email: string;
  role: string | null;
  status: string | null;
}

/**
 * Simplified hook to fetch all active users in the system
 * 
 * For single-company internal use, we don't need to filter by organisation_id
 * since all users belong to the same company.
 */
export function useOrganisationUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["organisation-users"],
    queryFn: async (): Promise<OrganisationUser[]> => {
      if (!user?.id) return [];

      // Fetch all active users - no org filter needed for single company
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
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
  });
}
