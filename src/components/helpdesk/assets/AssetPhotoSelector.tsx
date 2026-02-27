import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X, Search, ImageIcon, Check, Image } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AssetPhotoSelectorProps {
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
  bucket?: string;
}

export function AssetPhotoSelector({
  selectedUrl,
  onSelect,
  bucket = "asset-photos",
}: AssetPhotoSelectorProps) {
  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempSelectedUrl, setTempSelectedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dialogOpen) {
      fetchPhotos();
      setTempSelectedUrl(selectedUrl);
    }
  }, [dialogOpen, selectedUrl]);

  const fetchPhotos = async () => {
    setIsLoading(true);
    try {
      const seenUrls = new Set<string>();
      const uniquePhotos: { name: string; url: string }[] = [];

      // Only query distinct photo_urls from DB (source of truth, no storage scanning)
      const { data: assets } = await supabase
        .from("itam_assets")
        .select("custom_fields")
        .eq("is_active", true)
        .not("custom_fields->>photo_url", "is", null)
        .limit(1000);

      if (assets) {
        for (const asset of assets) {
          const photoUrl = (asset.custom_fields as Record<string, unknown>)?.photo_url as string | undefined;
          if (!photoUrl || seenUrls.has(photoUrl)) continue;
          if (!photoUrl.includes("supabase") && !photoUrl.includes("storage")) continue;
          seenUrls.add(photoUrl);
          const parts = photoUrl.split("/");
          const name = decodeURIComponent(parts[parts.length - 1] || "unknown");
          uniquePhotos.push({ name, url: photoUrl });
        }
      }

      setPhotos(uniquePhotos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      toast.error("Failed to load photos from storage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPG, PNG, GIF, or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `migrated/${fileName}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      setPhotos((prev) => [{ name: fileName, url: urlData.publicUrl }, ...prev]);
      setTempSelectedUrl(urlData.publicUrl);
      toast.success("Photo uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredPhotos = photos.filter((photo) =>
    photo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveSelection = () => onSelect(null);
  const handleDialogSave = () => { onSelect(tempSelectedUrl); setDialogOpen(false); };
  const handleDialogCancel = () => { setTempSelectedUrl(selectedUrl); setDialogOpen(false); };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {selectedUrl ? (
          <div className="relative">
            <img src={selectedUrl} alt="Selected asset" className="h-16 w-16 object-cover rounded-lg border" />
            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5" onClick={handleRemoveSelection}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="h-16 w-16 rounded-lg border border-dashed flex items-center justify-center bg-muted/30">
            <Image className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            {selectedUrl ? "Change Image" : "Select Image"}
          </Button>
          <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP - max 5MB</p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Asset Image</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="gap-1.5">
              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload New
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search images..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
          </div>
          <ScrollArea className="h-[350px] border rounded-lg p-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ImageIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">{searchQuery ? "No images match your search" : "No images in library"}</p>
                <p className="text-xs mt-1">Upload an image to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {filteredPhotos.map((photo) => (
                  <button key={photo.url} type="button" onClick={() => setTempSelectedUrl(photo.url)}
                    className={cn(
                      "relative aspect-square rounded-md overflow-hidden border-2 transition-all hover:opacity-90",
                      tempSelectedUrl === photo.url ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-muted-foreground/30"
                    )}>
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    {tempSelectedUrl === photo.url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogCancel}>Cancel</Button>
            <Button onClick={handleDialogSave}>Save Selection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleUpload} className="hidden" />
    </div>
  );
}
