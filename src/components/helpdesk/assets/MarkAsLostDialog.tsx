import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

interface MarkAsLostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function MarkAsLostDialog({ open, onOpenChange, assetId, assetName, onSuccess }: MarkAsLostDialogProps) {
  const queryClient = useQueryClient();
  const [lostDate, setLostDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");

  const markAsLostMutation = useMutation({
    mutationFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Close any open assignments for this asset
      const now = new Date().toISOString();
      await supabase
        .from("itam_asset_assignments")
        .update({ returned_at: now })
        .eq("asset_id", assetId)
        .is("returned_at", null);

      // Update asset status to lost
      const { error: assetError } = await supabase
        .from("itam_assets")
        .update({ 
          status: ASSET_STATUS.LOST,
          assigned_to: null,
          checked_out_to: null,
          checked_out_at: null,
          expected_return_date: null,
          check_out_notes: null,
        })
        .eq("id", assetId);
      
      if (assetError) throw assetError;

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "marked_as_lost",
        new_value: ASSET_STATUS.LOST,
        details: { 
          lost_date: lostDate.toISOString(),
          notes,
        },
        performed_by: currentUser?.id,
      });
    },
    onSuccess: () => {
      toast.success("Asset marked as lost");
      invalidateAllAssetQueries(queryClient);
      onSuccess?.();
      onOpenChange(false);
      setLostDate(new Date());
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to mark asset as lost");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    markAsLostMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark as Lost</DialogTitle>
          <DialogDescription>
            Mark "{assetName}" as lost.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Date Lost <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(lostDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={lostDate}
                  onSelect={(date) => date && setLostDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the circumstances..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
          <Button 
            onClick={handleSubmit} 
            disabled={markAsLostMutation.isPending}
          >
            {markAsLostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark as Lost
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
