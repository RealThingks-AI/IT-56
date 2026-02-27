import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simplified subscription stats hook for single-company internal use.
 * Fetches all subscription data without organisation filtering.
 */
export const useSubscriptionStats = () => {
  return useQuery({
    queryKey: ["subscription-stats"],
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes cache retention
    queryFn: async () => {
      const { data: tools, error } = await supabase
        .from("subscriptions_tools")
        .select("*");

      if (error) throw error;

      const activeTools = tools?.filter(t => t.status === "active").length || 0;
      const trialTools = tools?.filter(t => t.status === "trial").length || 0;
      const expiredTools = tools?.filter(t => t.status === "expired").length || 0;

      // Calculate renewals in next 30 days
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const pendingRenewals = tools?.filter(t => {
        if (!t.renewal_date || t.status !== "active") return false;
        const renewalDate = new Date(t.renewal_date);
        return renewalDate >= now && renewalDate <= thirtyDaysLater;
      }).length || 0;

      const totalLicenses = tools?.reduce((sum, t) => sum + (t.license_count || 0), 0) || 0;
      const vendorCount = new Set(tools?.map(t => t.vendor_id).filter(Boolean)).size;

      return {
        total: tools?.length || 0,
        activeTools,
        trialTools,
        expiredTools,
        pendingRenewals,
        totalLicenses,
        vendorCount,
      };
    },
  });
};
