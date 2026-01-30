import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Upload, X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

interface PhotosTabProps {
  assetId: string;
}

// Note: This is a local-only implementation since there's no itam_asset_photos table.
// In production, you'd want to create a table or use Supabase storage with metadata.

export const PhotosTab = ({ assetId }: PhotosTabProps) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      // Create local preview URL
      const url = URL.createObjectURL(file);
      setPhotos([...photos, url]);
      toast.success("Photo added");
      
      // In production, you'd upload to Supabase storage here:
      // const { error } = await supabase.storage
      //   .from("asset-photos")
      //   .upload(`${assetId}/${file.name}`, file);
      
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    URL.revokeObjectURL(photos[index]); // Clean up URL
    setPhotos(newPhotos);
    toast.success("Photo removed");
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="relative">
            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button variant="outline" size="sm" className="w-full" disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Photo"}
            </Button>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-6">
              <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No photos attached to this asset</p>
              <p className="text-xs text-muted-foreground mt-1">Add photos of the asset condition</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((url, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={url}
                    alt={`Asset photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPreviewUrl(url)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full-screen preview dialog */}
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl p-0">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Asset photo preview"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};