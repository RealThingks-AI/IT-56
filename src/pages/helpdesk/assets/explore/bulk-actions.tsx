import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Package, UserCheck, Trash2, Wrench } from "lucide-react";
import { getStatusLabel } from "@/lib/assets/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";

type BulkAction = "checkin" | "dispose" | "repair";

export default function BulkActionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets-bulk"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          make:itam_makes(id, name)
        `)
        .eq("is_active", true);
      return data || [];
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ action }: { action: BulkAction }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current statuses for history
      const selectedAssetData = assets.filter((a) => selectedAssets.includes(a.id));

      const targetStatus = action === "checkin" ? "available" : action === "dispose" ? "disposed" : "maintenance";

      // Build update payload — clear assignment fields on check-in
      const updateData: Record<string, any> = { status: targetStatus };
      if (action === "checkin") {
        updateData.checked_out_to = null;
        updateData.assigned_to = null;
        updateData.checked_out_at = null;
        updateData.expected_return_date = null;
      }

      const { error } = await supabase
        .from("itam_assets")
        .update(updateData)
        .in("id", selectedAssets);

      if (error) throw error;

      // Insert history records for each asset
      const actionLabel = action === "checkin" ? "Checked In" : action === "dispose" ? "Disposed" : "Sent to Repair";
      const historyEntries = selectedAssetData.map((asset) => ({
        asset_id: asset.id,
        action: actionLabel,
        field_name: "status",
        old_value: getStatusLabel(asset.status),
        new_value: getStatusLabel(targetStatus),
        changed_by: user.id,
        changed_at: new Date().toISOString(),
      }));

      if (historyEntries.length > 0) {
        await supabase.from("itam_asset_history").insert(historyEntries);
      }
    },
    onSuccess: () => {
      invalidateAllAssetQueries(queryClient);
      toast.success("Assets updated successfully");
      setSelectedAssets([]);
    },
    onError: (error) => {
      toast.error(`Failed to update assets: ${error.message}`);
    },
  });

  const toggleAsset = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const toggleAll = () => {
    if (selectedAssets.length === assets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(assets.map((a) => a.id));
    }
  };

  const handleBulkAction = (action: BulkAction) => {
    if (action === "checkin") {
      bulkUpdateMutation.mutate({ action });
    } else {
      setConfirmAction(action);
    }
  };

  const confirmLabels: Record<BulkAction, { title: string; description: string }> = {
    checkin: { title: "", description: "" },
    dispose: {
      title: `Dispose ${selectedAssets.length} asset(s)?`,
      description: "This will mark the selected assets as Disposed. This action is recorded in the asset history.",
    },
    repair: {
      title: `Send ${selectedAssets.length} asset(s) to Repair?`,
      description: "This will change the status of the selected assets to Repair.",
    },
  };

  return (
    <div className="h-full overflow-auto bg-background p-3">
      <div className="max-w-7xl mx-auto space-y-2.5">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-lg font-semibold">Bulk Actions</h1>
            <p className="text-sm text-muted-foreground">
              {selectedAssets.length} asset(s) selected
            </p>
          </div>
        </div>

        {selectedAssets.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                size="sm"
                onClick={() => navigate(`/assets/checkout`)}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Go to Check Out
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("checkin")}
                disabled={bulkUpdateMutation.isPending}
              >
                <Package className="h-4 w-4 mr-2" />
                Bulk Check In
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("dispose")}
                disabled={bulkUpdateMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Bulk Dispose
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("repair")}
                disabled={bulkUpdateMutation.isPending}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Bulk Repair
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={selectedAssets.length === assets.length && assets.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>ASSET ID</TableHead>
                <TableHead>MAKE</TableHead>
                <TableHead>MODEL</TableHead>
                <TableHead>CATEGORY</TableHead>
                <TableHead>STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading assets...
                  </TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No assets found.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAssets.includes(asset.id)}
                        onCheckedChange={() => toggleAsset(asset.id)}
                      />
                    </TableCell>
                    <TableCell>{asset.asset_id ? <span className="text-primary hover:underline cursor-pointer font-mono text-xs font-medium" onClick={() => navigate(`/assets/detail/${asset.asset_id || asset.id}`)}>{asset.asset_id}</span> : <span className="font-medium">—</span>}</TableCell>
                    <TableCell>{asset.make?.name || "—"}</TableCell>
                    <TableCell>{asset.model || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{asset.category?.name || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.status === "available" ? "default" : "secondary"}>
                        {getStatusLabel(asset.status || "available")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
          onConfirm={() => {
            bulkUpdateMutation.mutate({ action: confirmAction });
            setConfirmAction(null);
          }}
          title={confirmLabels[confirmAction].title}
          description={confirmLabels[confirmAction].description}
          confirmText={confirmAction === "dispose" ? "Dispose" : "Send to Repair"}
          variant="destructive"
        />
      )}
    </div>
  );
}
