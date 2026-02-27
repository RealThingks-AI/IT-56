import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageIcon, Eye } from "lucide-react";

interface AssetPhotoPreviewProps {
  photoUrl?: string | null;
  assetName?: string;
}

export function AssetPhotoPreview({ photoUrl, assetName }: AssetPhotoPreviewProps) {
  const [open, setOpen] = useState(false);

  if (!photoUrl) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <img
          src={photoUrl}
          alt={assetName || "Asset"}
          className="h-8 w-8 rounded object-cover"
          loading="lazy"
          decoding="async"
        />
        <span className="sr-only">View photo</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {assetName || "Asset Photo"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <img
              src={photoUrl}
              alt={assetName || "Asset"}
              className="max-h-[70vh] w-auto rounded-lg object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
