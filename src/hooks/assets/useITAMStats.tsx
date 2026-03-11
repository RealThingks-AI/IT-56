import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Optimized ITAM stats hook - single RPC call instead of 3 sequential queries.
 */
export const useITAMStats = () => {
  return useQuery({
    queryKey: ["itam-stats"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_itam_stats");
      if (error) throw error;

      return {
        totalAssets: (data as any)?.totalAssets || 0,
        assigned: (data as any)?.assigned || 0,
        licenses: (data as any)?.licenses || 0,
        laptops: 0,
      };
    },
  });
};
