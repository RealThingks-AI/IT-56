import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { 
  MoreHorizontal, 
  LogIn, 
  LogOut, 
  Wrench, 
  Trash2, 
  Copy, 
  Mail,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { ASSET_STATUS, canCheckIn, canCheckOut } from "@/lib/assetStatusUtils";
import { CheckOutDialog } from "./CheckOutDialog";
import { EmailAssetDialog } from "./EmailAssetDialog";

interface AssetActionsMenuProps {
  asset: {
    id: string;
    status: string | null;
    assigned_to?: string | null;
    asset_tag?: string | null;
    name?: string | null;
    asset_id?: string | null;
  };
  onActionComplete?: () => void;
}

export function AssetActionsMenu({ asset, onActionComplete }: AssetActionsMenuProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
    queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
    queryClient.invalidateQueries({ queryKey: ["itam-asset-detail"] });
    onActionComplete?.();
  };

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ status, clearAssignment }: { status: string; clearAssignment?: boolean }) => {
      const updateData: any = { status };
      if (clearAssignment) {
        updateData.assigned_to = null;
        updateData.checked_out_at = null;
        updateData.checked_out_to = null;
        updateData.expected_return_date = null;
        updateData.check_out_notes = null;
      }
      
      const { error } = await supabase
        .from("itam_assets")
        .update(updateData)
        .eq("id", asset.id);
      if (error) throw error;

      // If checking in, update assignment record
      if (status === ASSET_STATUS.AVAILABLE && clearAssignment) {
        await supabase
          .from("itam_asset_assignments")
          .update({ returned_at: new Date().toISOString() })
          .eq("asset_id", asset.id)
          .is("returned_at", null);
      }

      // Log to history
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("itam_asset_history").insert({
        asset_id: asset.id,
        action: `status_changed_to_${status}`,
        details: { previous_status: asset.status, new_status: status },
        performed_by: user?.id,
      });
    },
    onSuccess: (_, { status }) => {
      const statusLabels: Record<string, string> = {
        [ASSET_STATUS.AVAILABLE]: "checked in",
        [ASSET_STATUS.MAINTENANCE]: "marked for maintenance",
        [ASSET_STATUS.LOST]: "marked as lost",
        [ASSET_STATUS.DISPOSED]: "disposed",
      };
      toast.success(`Asset ${statusLabels[status] || "updated"} successfully`);
      invalidateQueries();
    },
    onError: (error) => {
      toast.error("Failed to update asset status");
      console.error(error);
    },
  });

  // Delete (soft delete) mutation
  const deleteAsset = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_active: false })
        .eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      invalidateQueries();
    },
    onError: (error) => {
      toast.error("Failed to delete asset");
      console.error(error);
    },
  });

  // Replicate mutation
  const replicateAsset = useMutation({
    mutationFn: async () => {
      // Fetch current asset data
      const { data: assetData, error: fetchError } = await supabase
        .from("itam_assets")
        .select("*")
        .eq("id", asset.id)
        .single();
      if (fetchError) throw fetchError;

      // Remove fields that should be unique
      const { id, created_at, updated_at, asset_id: originalAssetId, asset_tag, ...assetToCopy } = assetData;

      // Create new asset
      const { data, error } = await supabase
        .from("itam_assets")
        .insert({
          ...assetToCopy,
          name: `${assetToCopy.name || 'Asset'} (Copy)`,
          asset_id: `${originalAssetId}-COPY-${Date.now()}`,
          asset_tag: asset_tag ? `${asset_tag}-COPY` : null,
          status: ASSET_STATUS.AVAILABLE,
          assigned_to: null,
          checked_out_at: null,
          checked_out_to: null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Asset replicated successfully");
      invalidateQueries();
      navigate(`/assets/detail/${data.id}`);
    },
    onError: (error) => {
      toast.error("Failed to replicate asset");
      console.error(error);
    },
  });

  const handleCheckIn = () => {
    updateStatus.mutate({ status: ASSET_STATUS.AVAILABLE, clearAssignment: true });
  };

  const handleMaintenance = () => {
    updateStatus.mutate({ status: ASSET_STATUS.MAINTENANCE });
  };

  const handleLost = () => {
    updateStatus.mutate({ status: ASSET_STATUS.LOST });
  };

  const handleDispose = () => {
    navigate(`/assets/dispose?assetId=${asset.id}`);
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleReplicate = () => {
    replicateAsset.mutate();
  };

  const isLoading = updateStatus.isPending || deleteAsset.isPending || replicateAsset.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canCheckIn(asset.status) && (
            <DropdownMenuItem onClick={handleCheckIn}>
              <LogIn className="h-4 w-4 mr-2" />
              Check In
            </DropdownMenuItem>
          )}
          {canCheckOut(asset.status) && (
            <DropdownMenuItem onClick={() => setCheckOutDialogOpen(true)}>
              <LogOut className="h-4 w-4 mr-2" />
              Check Out
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleMaintenance}>
            <Wrench className="h-4 w-4 mr-2" />
            Repair / Maintenance
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLost}>
            <MapPin className="h-4 w-4 mr-2" />
            Mark as Lost
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDispose}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Dispose
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Email to User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Replicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => deleteAsset.mutate()}
        title="Delete Asset"
        description={`Are you sure you want to delete asset "${asset.asset_tag || asset.name || 'this asset'}"? This action can be reversed by an administrator.`}
        confirmText="Delete"
        variant="destructive"
      />

      <CheckOutDialog
        open={checkOutDialogOpen}
        onOpenChange={setCheckOutDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <EmailAssetDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        asset={asset}
      />
    </>
  );
}
