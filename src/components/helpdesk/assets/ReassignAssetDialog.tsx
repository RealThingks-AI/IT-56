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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUsers } from "@/hooks/useUsers";
import { getUserDisplayName } from "@/lib/userUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

interface ReassignAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  currentAssignedTo: string | null;
  onSuccess?: () => void;
}

export function ReassignAssetDialog({ open, onOpenChange, assetId, assetName, currentAssignedTo, onSuccess }: ReassignAssetDialogProps) {
  const queryClient = useQueryClient();
  const [newUserId, setNewUserId] = useState("");
  const [notes, setNotes] = useState("");
  const { data: users = [] } = useUsers();

  const reassignMutation = useMutation({
    mutationFn: async () => {
      if (!newUserId) throw new Error("Please select a user to reassign to");
      if (newUserId === currentAssignedTo) throw new Error("Asset is already assigned to this user");

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      // Resolve names
      let previousUserName = "Unknown";
      if (currentAssignedTo) {
        const { data: prevUser } = await supabase.from("users").select("name, email").eq("id", currentAssignedTo).single();
        previousUserName = prevUser?.name || prevUser?.email || currentAssignedTo;
      }
      const newUser = users.find(u => u.id === newUserId);
      const newUserName = getUserDisplayName(newUser) || newUser?.email || newUserId;

      // Get asset tag
      const { data: assetRecord } = await supabase.from("itam_assets").select("asset_tag").eq("id", assetId).single();

      // Update asset assignment
      const { error: updateErr } = await supabase
        .from("itam_assets")
        .update({
          assigned_to: newUserId,
          checked_out_to: newUserId,
          updated_at: now,
        })
        .eq("id", assetId);
      if (updateErr) throw updateErr;

      // Close old assignment
      if (currentAssignedTo) {
        await supabase
          .from("itam_asset_assignments")
          .update({ returned_at: now, notes: `Reassigned to ${newUserName}` })
          .eq("asset_id", assetId)
          .eq("assigned_to", currentAssignedTo)
          .is("returned_at", null);
      }

      // Create new assignment
      await supabase.from("itam_asset_assignments").insert({
        asset_id: assetId,
        assigned_to: newUserId,
        assigned_by: currentUser?.id || null,
        assigned_at: now,
        notes: notes || null,
      });

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "reassigned",
        old_value: previousUserName,
        new_value: newUserName,
        asset_tag: assetRecord?.asset_tag || null,
        details: {
          from: previousUserName,
          to: newUserName,
          notes,
        },
        performed_by: currentUser?.id,
      });
    },
    onSuccess: () => {
      toast.success("Asset reassigned successfully");
      invalidateAllAssetQueries(queryClient);
      onSuccess?.();
      onOpenChange(false);
      setNewUserId("");
      setNotes("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reassign asset");
      console.error(error);
    },
  });

  // Filter out current assignee from list
  const availableUsers = users.filter(u => u.id !== currentAssignedTo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign Asset</DialogTitle>
          <DialogDescription>
            Reassign "{assetName}" to a different user.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>New Assignee <span className="text-destructive">*</span></Label>
            <Select value={newUserId} onValueChange={setNewUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select new user" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {getUserDisplayName(user) || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reassign-notes">Notes</Label>
            <Textarea
              id="reassign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for reassignment..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => reassignMutation.mutate()}
            disabled={reassignMutation.isPending || !newUserId}
          >
            {reassignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
