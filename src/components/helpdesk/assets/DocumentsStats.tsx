import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, FileText, Package } from "lucide-react";
import { StatCard } from "@/components/helpdesk/assets/StatCard";

export const DocumentsStats = () => {
  const { data: docCount = 0, isLoading: loadingDocs } = useQuery({
    queryKey: ["itam-docs-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("itam_asset_documents").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: photoCount = 0, isLoading: loadingPhotos } = useQuery({
    queryKey: ["itam-photos-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("itam_assets")
        .select("*", { count: "exact", head: true })
        .not("custom_fields->>photo_url", "is", null)
        .neq("custom_fields->>photo_url", "");
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: assetsWithMedia = 0, isLoading: loadingMedia } = useQuery({
    queryKey: ["itam-assets-with-media"],
    queryFn: async () => {
      const { data: docAssets } = await supabase.from("itam_asset_documents").select("asset_id");
      const docSet = new Set((docAssets || []).map(d => d.asset_id).filter(id => id && id !== "00000000-0000-0000-0000-000000000000"));
      const { data: photoAssets } = await supabase
        .from("itam_assets")
        .select("id")
        .not("custom_fields->>photo_url", "is", null)
        .neq("custom_fields->>photo_url", "");
      (photoAssets || []).forEach(a => docSet.add(a.id));
      return docSet.size;
    },
  });

  const isLoading = loadingDocs || loadingPhotos || loadingMedia;

  if (isLoading) {
    return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[68px] rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
      <StatCard icon={Image} value={photoCount} label="Total Photos" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
      <StatCard icon={FileText} value={docCount} label="Total Documents" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
      <StatCard icon={Package} value={assetsWithMedia} label="Assets with Media" colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
    </div>
  );
};
