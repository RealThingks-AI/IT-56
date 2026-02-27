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

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function CheckInDialog({ open, onOpenChange, assetId, assetName, onSuccess }: CheckInDialogProps) {
  const queryClient = useQueryClient();
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const now = checkInDate.toISOString();

      // Update asset status and clear assignment fields
      const { error: assetError } = await supabase
        .from("itam_assets")
        .update({
          status: ASSET_STATUS.AVAILABLE,
          assigned_to: null,
          checked_out_to: null,
          checked_out_at: null,
          expected_return_date: null,
          check_out_notes: null,
        })
        .eq("id", assetId);
      
      if (assetError) throw assetError;

      // Update any active assignment record
      await supabase
        .from("itam_asset_assignments")
        .update({ 
          returned_at: now,
          notes: notes || null,
        })
        .eq("asset_id", assetId)
        .is("returned_at", null);

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "checked_in",
        details: { 
          returned_at: now,
          notes,
        },
        performed_by: currentUser?.id,
      });
    },
    onSuccess: () => {
      toast.success("Asset checked in successfully");
      invalidateAllAssetQueries(queryClient);
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setCheckInDate(new Date());
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to check in asset");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    checkInMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Check In Asset</DialogTitle>
          <DialogDescription>
            Return "{assetName}" to available inventory.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Check-in Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(checkInDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkInDate}
                  onSelect={(date) => date && setCheckInDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Return Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the condition or return..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={checkInMutation.isPending}
          >
            {checkInMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Check In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
