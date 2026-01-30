import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CurrentUserOrganisation {
  id: string;
  name: string;
  logo_url: string | null;
  active_tools: string[] | null;
  plan: string | null;
}

export interface CurrentUser {
  id: string;
  authUserId: string;
  email: string;
  name: string | null;
  role: string | null;
  organisationId: string | null;
  organisation: CurrentUserOrganisation | null;
  tenantId: number;
}

/**
 * Centralized user data hook that fetches user + org + tenant in a single query.
 * This consolidates multiple redundant queries across the app.
 * 
 * Use this hook instead of:
 * - useCurrentUserData
 * - Organisation context user fetch
 * - SidebarUserSection user fetch
 */
export function useCurrentUser() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-user-full', user?.id],
    queryFn: async (): Promise<CurrentUser | null> => {
      if (!user?.id) return null;

      // Single comprehensive query with joins
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          auth_user_id,
          email,
          name,
          role,
          organisation_id,
          organisation:organisations(
            id, name, logo_url, active_tools, plan
          )
        `)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get tenant_id from profiles (separate query since it's in a different table)
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle();

      // Type-safe extraction of organisation data
      const orgData = data.organisation as unknown as CurrentUserOrganisation | null;

      return {
        id: data.id,
        authUserId: data.auth_user_id,
        email: data.email,
        name: data.name,
        role: data.role,
        organisationId: data.organisation_id,
        organisation: orgData,
        tenantId: profile?.tenant_id || 1,
      };
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,  // 10 min - user data rarely changes
    gcTime: 30 * 60 * 1000,     // 30 min cache retention
  });
}