import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useITAMStats = () => {
  return useQuery({
    queryKey: ["itam-stats"],
    staleTime: 5 * 60 * 1000,  // 5 minutes - asset counts don't change frequently
    gcTime: 10 * 60 * 1000,    // 10 minutes cache retention
    queryFn: async () => {
      // Get total assets count from itam_assets table
      // @ts-ignore - Bypass deep type inference issue
      const { count: totalAssets } = await supabase
        .from("itam_assets")
        .select("*", { count: "exact", head: true });

      // Get assigned assets count from itam_asset_assignments
      // @ts-ignore - Bypass deep type inference issue
      const { count: assignedCount } = await supabase
        .from("itam_asset_assignments")
        .select("*", { count: "exact", head: true })
        .is("returned_at", null);

      // Get active licenses count from itam_licenses
      // @ts-ignore - Bypass deep type inference issue
      const { count: licensesCount } = await supabase
        .from("itam_licenses")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      return {
        totalAssets: totalAssets || 0,
        assigned: assignedCount || 0,
        licenses: licensesCount || 0,
        laptops: 0, // Will be implemented when category filtering is needed
      };
    },
  });
};
