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
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  EyeOff,
  Eye
} from "lucide-react";
import { ASSET_STATUS, canCheckIn, canCheckOut, getStatusLabel } from "@/lib/assets/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";
import { CheckOutDialog } from "./CheckOutDialog";
import { CheckInDialog } from "./CheckInDialog";
import { RepairAssetDialog } from "./RepairAssetDialog";
import { ReplicateAssetDialog } from "./ReplicateAssetDialog";
import { DisposeAssetDialog } from "./DisposeAssetDialog";
import { ReassignAssetDialog } from "./ReassignAssetDialog";

interface AssetActionsMenuProps {
  asset: {
    id: string;
    status: string | null;
    assigned_to?: string | null;
    asset_tag?: string | null;
    name?: string | null;
    asset_id?: string | null;
    is_hidden?: boolean;
  };
  onActionComplete?: () => void;
}

export function AssetActionsMenu({ asset, onActionComplete }: AssetActionsMenuProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [replicateDialogOpen, setReplicateDialogOpen] = useState(false);
  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);

  const invalidateQueries = () => {
    invalidateAllAssetQueries(queryClient);
    onActionComplete?.();
  };

  // Delete (soft delete) mutation with undo and history logging
  const deleteAsset = useMutation({
    mutationFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_active: false })
        .eq("id", asset.id);
      if (error) throw error;

      // Log deletion to history
      await supabase.from("itam_asset_history").insert({
        asset_id: asset.id,
        action: "deleted",
        details: { asset_tag: asset.asset_tag, asset_name: asset.name },
        performed_by: currentUser?.id,
      });
    },
    onSuccess: () => {
      toast.success(`Asset "${asset.asset_tag || asset.name || 'Asset'}" deleted`, {
        action: {
          label: "Undo",
          onClick: async () => {
            const { error } = await supabase
              .from("itam_assets")
              .update({ is_active: true })
              .eq("id", asset.id);
            if (!error) {
              // Log restoration to history
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              await supabase.from("itam_asset_history").insert({
                asset_id: asset.id,
                action: "restored",
                details: { asset_tag: asset.asset_tag, asset_name: asset.name },
                performed_by: currentUser?.id,
              });
              toast.success("Delete undone");
              invalidateQueries();
            }
          },
        },
        duration: 5000,
      });
      invalidateQueries();
    },
    onError: (error) => {
      toast.error("Failed to delete asset");
      console.error(error);
    },
  });

  // Hide/Unhide mutation
  const toggleHidden = useMutation({
    mutationFn: async (hide: boolean) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_hidden: hide } as any)
        .eq("id", asset.id);
      if (error) throw error;

      await supabase.from("itam_asset_history").insert({
        asset_id: asset.id,
        action: hide ? "hidden" : "unhidden",
        details: { asset_tag: asset.asset_tag, asset_name: asset.name },
        performed_by: currentUser?.id,
      });
    },
    onSuccess: (_, hide) => {
      toast.success(hide ? "Asset hidden from views" : "Asset is now visible");
      invalidateQueries();
    },
    onError: () => {
      toast.error("Failed to update visibility");
    },
  });

  const isLoading = deleteAsset.isPending || toggleHidden.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isLoading}>
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canCheckIn(asset.status) && (
            <DropdownMenuItem onClick={() => setCheckInDialogOpen(true)}>
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
          {asset.status === ASSET_STATUS.IN_USE && (
            <DropdownMenuItem onClick={() => setReassignDialogOpen(true)}>
              <UserCheck className="h-4 w-4 mr-2" />
              Reassign
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setRepairDialogOpen(true)}>
            <Wrench className="h-4 w-4 mr-2" />
            Repair
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDisposeDialogOpen(true)}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Dispose
          </DropdownMenuItem>
          {asset.assigned_to && (
            <DropdownMenuItem onClick={async () => {
              try {
                // Fetch assigned user email
                const { data: userData } = await supabase
                  .from("users")
                  .select("id, email, name, auth_user_id")
                  .eq("id", asset.assigned_to!)
                  .single();
                if (!userData?.email) { toast.error("No email found for assigned user"); return; }

                // Create confirmation record
                const token = crypto.randomUUID();
                const { data: confirmation, error: confError } = await supabase
                  .from("itam_asset_confirmations")
                  .insert({
                    user_id: userData.id,
                    status: "pending",
                    token,
                  })
                  .select("id")
                  .single();
                if (confError) throw confError;

                // Create confirmation item
                await supabase.from("itam_asset_confirmation_items").insert({
                  confirmation_id: confirmation.id,
                  asset_id: asset.id,
                  status: "pending",
                });

                // Send email
                await supabase.functions.invoke("send-asset-email", {
                  body: {
                    templateId: "asset_confirmation",
                    recipientEmail: userData.email,
                    assetId: asset.id,
                    variables: {
                      user_name: userData.name || userData.email,
                      token,
                      asset_count: "1",
                    },
                  },
                });

                toast.success("Confirmation email sent");
                invalidateQueries();
              } catch (err) {
                console.error(err);
                toast.error("Failed to send confirmation email");
              }
            }}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Send Confirmation
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setReplicateDialogOpen(true)}>
            <Copy className="h-4 w-4 mr-2" />
            Replicate
          </DropdownMenuItem>
          {asset.status === ASSET_STATUS.AVAILABLE && !asset.assigned_to && (
            <DropdownMenuItem onClick={async () => {
              try {
                const { error } = await supabase
                  .from("itam_assets")
                  .update({
                    confirmation_status: "confirmed",
                    last_confirmed_at: new Date().toISOString(),
                  } as any)
                  .eq("id", asset.id);
                if (error) throw error;
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from("itam_asset_history").insert({
                  asset_id: asset.id,
                  action: "stock_verified",
                  details: { verified_by: user?.id, method: "admin_manual" },
                  performed_by: user?.id,
                });
                toast.success("Asset verified as in stock");
                invalidateQueries();
              } catch (err) {
                console.error(err);
                toast.error("Failed to verify stock");
              }
            }}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify Stock
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {/* Hide / Unhide */}
          {asset.is_hidden ? (
            <DropdownMenuItem onClick={() => toggleHidden.mutate(false)}>
              <Eye className="h-4 w-4 mr-2" />
              Unhide
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => toggleHidden.mutate(true)}>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setDeleteConfirmOpen(true)} className="text-destructive focus:text-destructive">
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

      <CheckInDialog
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <RepairAssetDialog
        open={repairDialogOpen}
        onOpenChange={setRepairDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <ReplicateAssetDialog
        open={replicateDialogOpen}
        onOpenChange={setReplicateDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <DisposeAssetDialog
        open={disposeDialogOpen}
        onOpenChange={setDisposeDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <ReassignAssetDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        currentAssignedTo={asset.assigned_to || null}
        onSuccess={invalidateQueries}
      />
    </>
  );
}
