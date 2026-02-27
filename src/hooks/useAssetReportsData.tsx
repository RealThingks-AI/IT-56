import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simplified asset reports data hook for single-company internal use.
 * Fetches all asset data without organisation/tenant filtering.
 */
export const useAssetReportsData = () => {
  return useQuery({
    queryKey: ["asset-reports-full"],
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes cache retention
    queryFn: async () => {
      // Fetch all data in parallel - no org/tenant filtering
      const [
        assetsRes,
        assignmentsRes,
        licensesRes,
        repairsRes,
        maintenanceRes,
        historyRes,
        sitesRes,
        locationsRes,
        departmentsRes,
        categoriesRes
      ] = await Promise.all([
        supabase.from("itam_assets").select("*"),
        supabase.from("itam_asset_assignments").select("*"),
        supabase.from("itam_licenses").select("*"),
        supabase.from("itam_repairs").select("*"),
        supabase.from("itam_maintenance_schedules").select("*"),
        supabase.from("itam_asset_history").select("*"),
        supabase.from("itam_sites").select("*").eq("is_active", true),
        supabase.from("itam_locations").select("*").eq("is_active", true),
        supabase.from("itam_departments").select("*").eq("is_active", true),
        supabase.from("itam_categories").select("*").eq("is_active", true)
      ]);

      return {
        assets: assetsRes.data || [],
        assignments: assignmentsRes.data || [],
        licenses: licensesRes.data || [],
        repairs: repairsRes.data || [],
        maintenanceSchedules: maintenanceRes.data || [],
        assetHistory: historyRes.data || [],
        sites: sitesRes.data || [],
        locations: locationsRes.data || [],
        departments: departmentsRes.data || [],
        categories: categoriesRes.data || []
      };
    }
  });
};
