import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileImage, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface AssetPhoto {
  id: string;
  name: string;
  photo_url: string;
  created_at: string | null;
  metadata?: Record<string, unknown>;
}

export function PhotoGalleryDialog() {
  const queryClient = useQueryClient();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<AssetPhoto | null>(null);

  // Fetch asset photos from storage bucket
  const { data: assetPhotos, refetch: refetchPhotos } = useQuery({
    queryKey: ["asset-photos-storage"],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("asset-photos")
        .list();

      if (error) throw error;

      // Get public URLs for all files
      const photosWithUrls = data.map((file) => {
        const { data: { publicUrl } } = supabase.storage
          .from("asset-photos")
          .getPublicUrl(file.name);

        return {
          id: file.id,
          name: file.name,
          photo_url: publicUrl,
          created_at: file.created_at,
          metadata: file.metadata,
        };
      });

      return photosWithUrls as AssetPhoto[];
    },
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("asset-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;
    },
    onSuccess: () => {
      toast.success("Photo uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-photos-storage"] });
      refetchPhotos();
    },
    onError: (error) => {
      toast.error("Failed to upload photo");
      console.error(error);
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photo: AssetPhoto) => {
      const { error: storageError } = await supabase.storage
        .from("asset-photos")
        .remove([photo.name]);

      if (storageError) throw storageError;
    },
    onSuccess: () => {
      toast.success("Photo deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-photos-storage"] });
      refetchPhotos();
    },
    onError: (error) => {
      toast.error("Failed to delete photo");
      console.error(error);
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploadingPhoto(true);
    try {
      await uploadPhotoMutation.mutateAsync(file);
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                <FileImage className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Photo Gallery</CardTitle>
              <CardDescription className="text-xs">
                Browse asset photos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">
                {assetPhotos?.length || 0} photos
              </div>
              <Button variant="outline" className="w-full h-7 text-xs">
                Open Gallery
              </Button>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Photo Gallery</DialogTitle>
            <DialogDescription>
              Browse, upload, and manage asset photos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploadingPhoto} asChild>
                  <span>
                    <Plus className="h-4 w-4 mr-2" />
                    {uploadingPhoto ? "Uploading..." : "Add Photo"}
                  </span>
                </Button>
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {assetPhotos?.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={photo.photo_url}
                      alt={photo.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                      onError={(e) => {
                        e.currentTarget.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeletePhotoConfirm(photo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="text-xs mt-2">
                    <p className="font-medium truncate" title={photo.name}>
                      {photo.name}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {photo.created_at ? format(new Date(photo.created_at), "MMM dd, yyyy") : ""}
                    </p>
                  </div>
                </div>
              ))}
              {(!assetPhotos || assetPhotos.length === 0) && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <FileImage className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No photos available. Upload your first photo!</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletePhotoConfirm !== null}
        onOpenChange={(open) => !open && setDeletePhotoConfirm(null)}
        onConfirm={() => {
          if (deletePhotoConfirm) {
            deletePhotoMutation.mutate(deletePhotoConfirm);
          }
          setDeletePhotoConfirm(null);
        }}
        title="Delete Photo"
        description="Are you sure you want to delete this photo? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
