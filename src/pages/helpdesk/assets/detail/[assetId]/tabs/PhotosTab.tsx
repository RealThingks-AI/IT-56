import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Upload, X, ZoomIn, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface PhotosTabProps {
  assetId: string;
}

interface PhotoMeta {
  url: string;
  name: string;
  uploaded_at: string;
}

export const PhotosTab = ({ assetId }: PhotosTabProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: photos = [], isLoading, refetch } = useQuery({
    queryKey: ["asset-photos", assetId],
    queryFn: async () => {
      const { data: files, error } = await supabase.storage
        .from("asset-photos")
        .list(assetId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error) { console.error("Error fetching photos:", error); return []; }
      if (!files || files.length === 0) return [];
      return files
        .filter(file => file.name !== ".emptyFolderPlaceholder")
        .map(file => {
          const { data } = supabase.storage.from("asset-photos").getPublicUrl(`${assetId}/${file.name}`);
          return { url: data.publicUrl, name: file.name, uploaded_at: file.created_at || "" } as PhotoMeta;
        });
    },
    enabled: !!assetId,
  });

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("asset-photos")
        .upload(`${assetId}/${fileName}`, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      toast.success("Photo uploaded successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await uploadFile(file);
    event.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleRemove = async (fileName: string) => {
    try {
      const { error } = await supabase.storage.from("asset-photos").remove([`${assetId}/${fileName}`]);
      if (error) throw error;
      toast.success("Photo removed");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove photo");
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Upload area with drag-and-drop */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 py-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 py-1">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop or <span className="text-primary font-medium">browse</span>
                </p>
                <p className="text-[10px] text-muted-foreground">PNG, JPG up to 5MB</p>
              </div>
            )}
          </div>

          {/* Photo count */}
          {photos.length > 0 && (
            <p className="text-xs text-muted-foreground">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          )}

          {photos.length === 0 ? (
            <div className="text-center py-6">
              <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No photos attached to this asset</p>
              <p className="text-xs text-muted-foreground mt-1">Add photos of the asset condition</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={photo.name} className="relative group aspect-square">
                  <img
                    src={photo.url}
                    alt={`Asset photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => setPreviewUrl(photo.url)}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleRemove(photo.name)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {photo.uploaded_at && (
                      <span className="text-[10px] text-white/80">
                        {format(new Date(photo.uploaded_at), "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl p-0">
            {previewUrl && (
              <img src={previewUrl} alt="Asset photo preview" className="w-full h-auto max-h-[80vh] object-contain" />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
