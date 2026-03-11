import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMonthlyEquivalentINR, getAnnualContributionINR, getCycleThresholds, SUB_QUERY_KEYS } from "@/lib/subscriptions/subscriptionUtils";

export const useSubscriptionStats = () => {
  return useQuery({
    queryKey: [...SUB_QUERY_KEYS.stats],
    staleTime: 30_000,
    placeholderData: (prev: any) => prev,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data: tools, error } = await supabase
        .from("subscriptions_tools")
        .select("id, status, renewal_date, subscription_type, total_cost, currency, license_count, vendor_id, created_at");

      if (error) throw error;

      const activeTools = tools?.filter(t => t.status === "active").length || 0;
      const trialTools = tools?.filter(t => t.status === "trial").length || 0;
      const expiredTools = tools?.filter(t => t.status === "expired").length || 0;

      const now = new Date();
      const pendingRenewals = tools?.filter(t => {
        if (!t.renewal_date || t.status !== "active") return false;
        const d = new Date(t.renewal_date);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
        const { expiringSoonDays } = getCycleThresholds(t.subscription_type);
        return diffDays >= 0 && diffDays <= expiringSoonDays;
      }).length || 0;

      const totalLicenses = tools?.reduce((sum, t) => sum + (t.license_count || 0), 0) || 0;
      const vendorCount = new Set(tools?.map(t => t.vendor_id).filter(Boolean)).size;

      const monthlyBurn = tools
        ?.filter(t => t.status === "active")
        .reduce((sum, t) => {
          return sum + getMonthlyEquivalentINR(Number(t.total_cost || 0), t.currency, t.subscription_type);
        }, 0) || 0;

      const annualCost = tools
        ?.filter(t => t.status === "active")
        .reduce((sum, t) => {
          return sum + getAnnualContributionINR(Number(t.total_cost || 0), t.currency, t.subscription_type, t.created_at);
        }, 0) || 0;

      return {
        total: tools?.length || 0,
        activeTools,
        trialTools,
        expiredTools,
        pendingRenewals,
        totalLicenses,
        vendorCount,
        monthlyBurn,
        annualCost,
      };
    },
  });
};
