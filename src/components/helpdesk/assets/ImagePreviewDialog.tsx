import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImagePreviewDialogProps {
  image: { url: string; name: string } | null;
  onClose: () => void;
}

export function ImagePreviewDialog({ image, onClose }: ImagePreviewDialogProps) {
  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-2 pt-8">
        {image && (
          <img
            src={image.url}
            alt={image.name}
            className="w-full h-auto max-h-[70vh] object-contain rounded"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
