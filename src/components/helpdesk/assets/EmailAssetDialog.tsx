import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EmailAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    id: string;
    asset_tag?: string | null;
    name?: string | null;
    assigned_to?: string | null;
  };
}

export function EmailAssetDialog({ open, onOpenChange, asset }: EmailAssetDialogProps) {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [attachPhotos, setAttachPhotos] = useState(false);
  const [attachDocuments, setAttachDocuments] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emails = email.split(',').map(e => e.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(e => !emailRegex.test(e));
    
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email address: ${invalidEmails[0]}`);
      return;
    }

    setIsSending(true);
    
    try {
      // Build subject line
      const subject = `Regarding Asset: ${asset.asset_tag || asset.name || 'Asset'}`;
      
      // Build email body
      let body = notes || '';
      if (attachPhotos || attachDocuments) {
        body += '\n\n---\nAttachments requested:';
        if (attachPhotos) body += '\n• Photos';
        if (attachDocuments) body += '\n• Documents';
      }
      
      // Open the default mail client with all recipients
      const mailtoLink = `mailto:${emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_blank');
      
      toast.success("Email client opened");
      onOpenChange(false);
      // Reset form
      setEmail("");
      setNotes("");
      setAttachPhotos(false);
      setAttachDocuments(false);
    } catch (error) {
      toast.error("Failed to open email client");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Email Asset</DialogTitle>
          <DialogDescription>
            Send an email regarding asset "{asset.asset_tag || asset.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email to <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <p className="text-xs text-muted-foreground">
              * separate each email with a comma.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter your message..."
              rows={4}
            />
          </div>

          <div className="space-y-3">
            <Label>Attachments</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attachPhotos"
                  checked={attachPhotos}
                  onCheckedChange={(checked) => setAttachPhotos(checked === true)}
                />
                <Label htmlFor="attachPhotos" className="font-normal cursor-pointer">
                  Photos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attachDocuments"
                  checked={attachDocuments}
                  onCheckedChange={(checked) => setAttachDocuments(checked === true)}
                />
                <Label htmlFor="attachDocuments" className="font-normal cursor-pointer">
                  Documents
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
          <Button 
            onClick={handleSend} 
            disabled={!email || isSending}
          >
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Email
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
