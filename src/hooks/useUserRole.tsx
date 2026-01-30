import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "manager" | "user" | "viewer";

interface UserRoleResult {
  role: AppRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
  isViewer: boolean;
  isAdminOrAbove: boolean;
  isManagerOrAbove: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useUserRole(): UserRoleResult {
  const { user, loading: authLoading } = useAuth();

  const { data: role, isLoading, error } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Use the security definer function to get role
      const { data, error } = await supabase
        .rpc("get_user_role", { _user_id: user.id });
      
      if (error) {
        console.error("Error fetching user role:", error);
        throw error;
      }
      
      return data as AppRole | null;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes - role rarely changes
    gcTime: 15 * 60 * 1000, // 15 minutes cache retention
  });

  const currentRole = role || null;
  
  return {
    role: currentRole,
    isAdmin: currentRole === "admin",
    isManager: currentRole === "manager",
    isUser: currentRole === "user",
    isViewer: currentRole === "viewer",
    isAdminOrAbove: currentRole === "admin",
    isManagerOrAbove: currentRole === "admin" || currentRole === "manager",
    isLoading: authLoading || isLoading,
    error: error as Error | null,
  };
}
