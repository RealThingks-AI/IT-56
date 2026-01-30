import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SystemUpdate } from "./UpdateCard";

interface UpdateDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  update?: SystemUpdate;
}

export function UpdateDetailsDialog({ open, onOpenChange, update }: UpdateDetailsDialogProps) {
  if (!update) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{update.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {update.version && <Badge variant="outline">{update.version}</Badge>}
            <Badge className="capitalize">{update.status}</Badge>
            {update.severity && (
              <Badge variant={update.severity === 'critical' ? 'destructive' : 'outline'}>
                {update.severity}
              </Badge>
            )}
            <Badge variant="secondary" className="capitalize">{update.category}</Badge>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{update.description}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-1">Release Date</h4>
              <p className="text-sm text-muted-foreground">{update.date}</p>
            </div>
            {update.size && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Size</h4>
                <p className="text-sm text-muted-foreground">{update.size}</p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Installation Notes</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>System restart may be required</li>
              <li>Estimated installation time: 15-30 minutes</li>
              <li>Backup recommended before installation</li>
              <li>No known compatibility issues</li>
            </ul>
          </div>

          {update.status === 'failed' && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2 text-destructive">Error Information</h4>
                <p className="text-sm text-muted-foreground">
                  Installation failed due to insufficient disk space. Please free up at least 2GB and retry.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
