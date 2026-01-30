import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAssetReports = () => {
  return useQuery({
    queryKey: ["asset-reports"],
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

      // Fetch all assets from itam_assets
      // @ts-ignore - Bypass deep type inference issue
      let assetsQuery = supabase.from("itam_assets").select("*");
      if (orgId) {
        assetsQuery = assetsQuery.eq("organisation_id", orgId);
      } else {
        assetsQuery = assetsQuery.eq("tenant_id", tenantId);
      }
      const { data: assets } = await assetsQuery;

      // Fetch assignments from itam_asset_assignments
      // @ts-ignore - Bypass deep type inference issue
      let assignmentsQuery = supabase
        .from("itam_asset_assignments")
        .select("*");
      if (orgId) {
        assignmentsQuery = assignmentsQuery.eq("organisation_id", orgId);
      } else {
        assignmentsQuery = assignmentsQuery.eq("tenant_id", tenantId);
      }
      const { data: assignments } = await assignmentsQuery;

      // Fetch licenses from itam_licenses
      // @ts-ignore - Bypass deep type inference issue
      let licensesQuery = supabase.from("itam_licenses").select("*");
      if (orgId) {
        licensesQuery = licensesQuery.eq("organisation_id", orgId);
      } else {
        licensesQuery = licensesQuery.eq("tenant_id", tenantId);
      }
      const { data: licenses } = await licensesQuery;

      // Fetch repairs from itam_repairs
      // @ts-ignore - Bypass deep type inference issue
      let repairsQuery = supabase.from("itam_repairs").select("*");
      if (orgId) {
        repairsQuery = repairsQuery.eq("organisation_id", orgId);
      } else {
        repairsQuery = repairsQuery.eq("tenant_id", tenantId);
      }
      const { data: repairs } = await repairsQuery;

      return {
        assets: assets || [],
        assignments: assignments || [],
        licenses: licenses || [],
        repairs: repairs || [],
      };
    },
  });
};
