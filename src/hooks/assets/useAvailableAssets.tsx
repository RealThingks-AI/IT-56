import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchInput } from "@/lib/utils";

interface UseAvailableAssetsOptions {
  status: string | string[];
  search: string;
  excludeStatus?: string;
  queryKey: string;
  limit?: number;
}

export function useAvailableAssets({
  status,
  search,
  excludeStatus,
  queryKey,
  limit = 500,
}: UseAvailableAssetsOptions) {
  const deferredSearch = useDeferredValue(search);

  const query = useQuery({
    queryKey: [queryKey, deferredSearch],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let q = supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name), make:itam_makes!make_id(name)")
        .eq("is_active", true)
        .eq("is_hidden", false)
        .order("name");

      if (Array.isArray(status)) {
        q = q.in("status", status);
      } else if (excludeStatus) {
        q = q.neq("status", excludeStatus);
      } else {
        q = q.eq("status", status);
      }

      if (deferredSearch) {
        const s = sanitizeSearchInput(deferredSearch);
        q = q.or(
          `name.ilike.%${s}%,asset_tag.ilike.%${s}%,asset_id.ilike.%${s}%,serial_number.ilike.%${s}%,model.ilike.%${s}%`
        );
      }

      const { data, error } = await q.limit(limit);
      if (error) throw error;
      return data || [];
    },
  });

  const isStaleSearch = search !== deferredSearch;

  return { ...query, isStaleSearch, deferredSearch };
}
