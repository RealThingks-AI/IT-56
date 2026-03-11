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
        supabase.from("itam_assets").select("id, asset_tag, asset_id, name, status, category_id, site_id, location_id, department_id, purchase_date, purchase_price, warranty_expiry, is_active, created_at").eq("is_hidden", false).limit(10000),
        supabase.from("itam_asset_assignments").select("id, asset_id, assigned_to, assigned_at, returned_at").limit(10000),
        supabase.from("itam_licenses").select("id, name, license_type, seats_total, seats_allocated, expiry_date, is_active, cost").limit(10000),
        supabase.from("itam_repairs").select("id, asset_id, status, repair_cost, created_at, completed_at").limit(10000),
        supabase.from("itam_maintenance_schedules").select("id, asset_id, schedule_type, next_due_date, is_active").limit(10000),
        supabase.from("itam_asset_history").select("id, asset_id, action, performed_by, created_at, details").limit(10000),
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
