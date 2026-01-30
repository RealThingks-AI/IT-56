import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";

interface CheckOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function CheckOutDialog({ open, onOpenChange, assetId, assetName, onSuccess }: CheckOutDialogProps) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [notes, setNotes] = useState("");

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ["users-for-checkout"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name, email")
        .order("name");
      return data || [];
    },
    enabled: open,
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Please select a user");

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      // Get selected user's name for display
      const selectedUser = users.find((u: any) => u.id === userId);
      const assignedToName = selectedUser?.name || selectedUser?.email || userId;

      // Update asset status and assignment info
      const { error: assetError } = await supabase
        .from("itam_assets")
        .update({
          status: ASSET_STATUS.IN_USE,
          assigned_to: assignedToName,
          checked_out_at: now,
          checked_out_to: userId,
          expected_return_date: expectedReturnDate?.toISOString() || null,
          check_out_notes: notes || null,
        })
        .eq("id", assetId);
      
      if (assetError) throw assetError;

      // Get tenant_id and organisation_id from the asset
      const { data: assetData } = await supabase
        .from("itam_assets")
        .select("tenant_id, organisation_id")
        .eq("id", assetId)
        .single();

      // Create assignment record
      const { error: assignmentError } = await supabase
        .from("itam_asset_assignments")
        .insert({
          asset_id: assetId,
          assigned_to: userId,
          assigned_at: now,
          assigned_by: currentUser?.id,
          notes: notes || null,
          tenant_id: assetData?.tenant_id,
          organisation_id: assetData?.organisation_id,
        });

      if (assignmentError) throw assignmentError;

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "checked_out",
        details: { 
          assigned_to: assignedToName, 
          user_id: userId,
          expected_return: expectedReturnDate?.toISOString(),
          notes 
        },
        performed_by: currentUser?.id,
        tenant_id: assetData?.tenant_id,
        organisation_id: assetData?.organisation_id,
      });
    },
    onSuccess: () => {
      toast.success(`Asset checked out successfully`);
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["itam-asset-detail"] });
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setUserId("");
      setExpectedReturnDate(addDays(new Date(), 7));
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to check out asset");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    checkOutMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Check Out Asset</DialogTitle>
          <DialogDescription>
            Assign "{assetName}" to a user.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user">Assign to User <span className="text-destructive">*</span></Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Expected Return Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expectedReturnDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expectedReturnDate ? format(expectedReturnDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expectedReturnDate}
                  onSelect={setExpectedReturnDate}
                  disabled={(date) => date < new Date()}
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
              placeholder="Optional notes about this checkout..."
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
            disabled={!userId || checkOutMutation.isPending}
          >
            {checkOutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Check Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
