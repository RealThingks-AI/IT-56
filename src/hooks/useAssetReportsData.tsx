import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAssetReportsData = () => {
  return useQuery({
    queryKey: ["asset-reports-full"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();

      const tenantId = profileData?.tenant_id || 1;
      const orgId = userData?.organisation_id;

      // Helper to add org/tenant filter
      const addFilter = (query: any) => {
        if (orgId) {
          return query.eq("organisation_id", orgId);
        }
        return query.eq("tenant_id", tenantId);
      };

      // Fetch all data in parallel
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
        addFilter(supabase.from("itam_assets").select("*")),
        addFilter(supabase.from("itam_asset_assignments").select("*")),
        addFilter(supabase.from("itam_licenses").select("*")),
        addFilter(supabase.from("itam_repairs").select("*")),
        addFilter(supabase.from("itam_maintenance_schedules").select("*")),
        addFilter(supabase.from("itam_asset_history").select("*")),
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
