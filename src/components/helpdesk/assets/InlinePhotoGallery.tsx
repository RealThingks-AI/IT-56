import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Image, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const InlinePhotoGallery = () => {
  const queryClient = useQueryClient();
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<any>(null);

  const { data: assetPhotos, isLoading } = useQuery({
    queryKey: ["asset-photos-storage"],
    queryFn: async () => {
      const { data: assets } = await supabase
        .from("itam_assets")
        .select("custom_fields")
        .eq("is_active", true)
        .not("custom_fields->>photo_url", "is", null)
        .limit(1000);
      const seenUrls = new Set<string>();
      const dbPhotos: { id: string; name: string; path: string; photo_url: string; created_at: string | null }[] = [];
      if (assets) {
        for (const asset of assets) {
          const photoUrl = (asset.custom_fields as Record<string, unknown>)?.photo_url as string | undefined;
          if (!photoUrl || seenUrls.has(photoUrl)) continue;
          if (!photoUrl.includes("supabase") && !photoUrl.includes("storage")) continue;
          seenUrls.add(photoUrl);
          const parts = photoUrl.split("/");
          const name = parts[parts.length - 1] || "unknown";
          const bucketIdx = photoUrl.indexOf("/asset-photos/");
          const path = bucketIdx >= 0 ? photoUrl.substring(bucketIdx + "/asset-photos/".length) : `migrated/${name}`;
          dbPhotos.push({ id: photoUrl, name: decodeURIComponent(name), path, photo_url: photoUrl, created_at: null });
        }
      }
      return dbPhotos;
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photo: any) => {
      const { error: storageError } = await supabase.storage.from("asset-photos").remove([photo.path]);
      if (storageError) throw storageError;
      const { data: affectedAssets } = await supabase.from("itam_assets").select("id, custom_fields").eq("is_active", true).not("custom_fields->>photo_url", "is", null);
      if (affectedAssets) {
        for (const asset of affectedAssets) {
          const cf = asset.custom_fields as Record<string, unknown> | null;
          if (cf?.photo_url === photo.photo_url) {
            const updatedCf = { ...cf } as Record<string, unknown>;
            delete updatedCf.photo_url;
            await supabase.from("itam_assets").update({ custom_fields: updatedCf as any }).eq("id", asset.id);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Photo deleted");
      queryClient.invalidateQueries({ queryKey: ["asset-photos-storage"] });
    },
    onError: () => toast.error("Failed to delete photo"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Photos</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Photos</span>
          <span className="text-xs text-muted-foreground">({assetPhotos?.length || 0})</span>
        </div>
        {(!assetPhotos || assetPhotos.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos linked to any assets yet.</p>
            <p className="text-xs mt-1">Add photos from the asset detail view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {assetPhotos.map((photo) => (
              <div key={photo.photo_url} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={photo.photo_url} alt={photo.name} className="w-full h-full object-cover hover:scale-105 transition-transform" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'; }} />
                </div>
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeletePhotoConfirm(photo)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
                <p className="text-[10px] mt-1 truncate text-muted-foreground" title={photo.name}>{photo.name}</p>
              </div>
            ))}
          </div>
        )}
        <ConfirmDialog
          open={!!deletePhotoConfirm}
          onOpenChange={(open) => { if (!open) setDeletePhotoConfirm(null); }}
          onConfirm={() => { if (deletePhotoConfirm) deletePhotoMutation.mutate(deletePhotoConfirm); setDeletePhotoConfirm(null); }}
          title="Delete Photo"
          description="Delete this photo? This cannot be undone."
          confirmText="Delete"
          variant="destructive"
        />
      </CardContent>
    </Card>
  );
};
