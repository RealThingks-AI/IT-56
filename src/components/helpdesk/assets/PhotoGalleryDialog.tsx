import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileImage, Trash2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface AssetPhoto {
  id: string;
  name: string;
  path: string;
  photo_url: string;
  created_at: string | null;
}

export function PhotoGalleryDialog() {
  const queryClient = useQueryClient();
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<AssetPhoto | null>(null);

  // Query distinct photo_urls from itam_assets to get deduplicated list
  const { data: assetPhotos, refetch: refetchPhotos } = useQuery({
    queryKey: ["asset-photos-storage"],
    queryFn: async () => {
      const { data: assets } = await supabase
        .from("itam_assets")
        .select("custom_fields")
        .eq("is_active", true)
        .not("custom_fields->>photo_url", "is", null)
        .limit(1000);

      const seenUrls = new Set<string>();
      const dbPhotos: AssetPhoto[] = [];

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

          dbPhotos.push({
            id: photoUrl,
            name: decodeURIComponent(name),
            path,
            photo_url: photoUrl,
            created_at: null,
          });
        }
      }

      return dbPhotos;
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photo: AssetPhoto) => {
      // 1. Remove from storage
      const { error: storageError } = await supabase.storage.from("asset-photos").remove([photo.path]);
      if (storageError) throw storageError;

      // 2. Clear DB references: nullify photo_url in any asset referencing this photo
      const { data: affectedAssets } = await supabase
        .from("itam_assets")
        .select("id, custom_fields")
        .eq("is_active", true)
        .not("custom_fields->>photo_url", "is", null);

      if (affectedAssets) {
        for (const asset of affectedAssets) {
          const cf = asset.custom_fields as Record<string, unknown> | null;
          if (cf?.photo_url === photo.photo_url) {
            const updatedCf = { ...cf } as Record<string, unknown>;
            delete updatedCf.photo_url;
            await supabase
              .from("itam_assets")
              .update({ custom_fields: updatedCf as any })
              .eq("id", asset.id);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Photo deleted and references cleared");
      queryClient.invalidateQueries({ queryKey: ["asset-photos-storage"] });
      queryClient.invalidateQueries({ queryKey: ["itam-assets"] });
      refetchPhotos();
    },
    onError: (error) => { toast.error("Failed to delete photo"); console.error(error); },
  });

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <FileImage className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Photo Gallery</CardTitle>
              <CardDescription className="text-xs">Browse asset photos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">{assetPhotos?.length || 0} {(assetPhotos?.length || 0) === 1 ? 'photo' : 'photos'}</div>
              <Button variant="outline" className="w-full h-8 text-xs">Open Gallery</Button>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Photo Gallery</DialogTitle>
            <DialogDescription>Browse and manage asset photos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Info banner — photos are added from asset detail */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              <span>Photos are added from the asset detail view. This gallery shows all photos currently linked to assets.</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {assetPhotos?.map((photo) => (
                <div key={photo.photo_url} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={photo.photo_url} alt={photo.name} className="w-full h-full object-cover hover:scale-110 transition-transform" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'; }} />
                  </div>
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeletePhotoConfirm(photo)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="text-xs mt-2">
                    <p className="font-medium truncate" title={photo.name}>{photo.name}</p>
                    <p className="text-muted-foreground text-[10px]">{photo.created_at ? format(new Date(photo.created_at), "MMM dd, yyyy") : ""}</p>
                  </div>
                </div>
              ))}
              {(!assetPhotos || assetPhotos.length === 0) && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <FileImage className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No photos linked to any assets yet.</p>
                  <p className="text-xs mt-1">Add photos from the asset detail view.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletePhotoConfirm !== null}
        onOpenChange={(open) => !open && setDeletePhotoConfirm(null)}
        onConfirm={() => { if (deletePhotoConfirm) deletePhotoMutation.mutate(deletePhotoConfirm); setDeletePhotoConfirm(null); }}
        title="Delete Photo"
        description="Are you sure you want to delete this photo? This will also remove the photo reference from any linked assets. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
