import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Simple hook to get the current user's organisation_id from the database
 * 
 * This is used for database queries that still require organisation_id filtering
 * for proper RLS policies. For single-company use, this just returns the user's
 * assigned organisation which should be the same for all users.
 */
export function useUserOrganisation() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-organisation-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      if (error) {
        console.error("Failed to get user organisation:", error);
        return null;
      }

      return data?.organisation_id || null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - rarely changes
    gcTime: 30 * 60 * 1000,   // 30 minutes cache
  });

  return {
    organisationId: data,
    isLoading,
    error,
  };
}
