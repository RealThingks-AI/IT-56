import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "itam-stats-cache";

function getCachedStats() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return undefined;
}

/**
 * Optimized ITAM stats hook - single RPC call instead of 3 sequential queries.
 * Uses localStorage cache for instant repeat loads.
 */
export const useITAMStats = () => {
  return useQuery({
    queryKey: ["itam-stats"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: getCachedStats,
    initialDataUpdatedAt: () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY + "-ts");
        return raw ? Number(raw) : 0;
      } catch { return 0; }
    },
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_itam_stats");
      if (error) throw error;

      const result = {
        totalAssets: (data as any)?.totalAssets || 0,
        assigned: (data as any)?.assigned || 0,
        licenses: (data as any)?.licenses || 0,
        laptops: 0,
      };

      // Cache for instant repeat loads
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(result));
        localStorage.setItem(CACHE_KEY + "-ts", String(Date.now()));
      } catch { /* ignore */ }

      return result;
    },
  });
};
