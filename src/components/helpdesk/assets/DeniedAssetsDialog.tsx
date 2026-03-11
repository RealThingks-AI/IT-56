import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { XCircle, MoreHorizontal, UserPlus, RotateCcw, Send, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";
import { useUsers } from "@/hooks/useUsers";
import { ASSET_STATUS } from "@/lib/assets/assetStatusUtils";

interface DeniedAssetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeniedAssetsDialog({ open, onOpenChange }: DeniedAssetsDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: allUsers = [] } = useUsers();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reassignAssetId, setReassignAssetId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState("");

  const { data: deniedAssets = [], isLoading } = useQuery({
    queryKey: ["denied-assets-dialog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("id, name, asset_tag, asset_id, status, assigned_to, confirmation_status, last_confirmed_at, serial_number, model, make:itam_makes!make_id(name), category:itam_categories(name), custom_fields")
        .eq("confirmation_status", "denied")
        .eq("is_active", true)
        .eq("is_hidden", false)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: open,
  });

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach((u: any) => map.set(u.id, u.name || u.email));
    return map;
  }, [allUsers]);

  const returnMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("itam_assets").update({
        assigned_to: null, status: "available", confirmation_status: null,
        checked_out_to: null, checked_out_at: null, expected_return_date: null,
        check_out_notes: null, updated_at: new Date().toISOString(),
      }).eq("id", assetId);

      if (user) {
        const ids = deniedAssets.filter((a: any) => a.id === assetId).map((a: any) => a.assigned_to).filter(Boolean);
        for (const uid of ids) {
          await supabase.from("itam_asset_assignments")
            .update({ returned_at: new Date().toISOString() })
            .eq("asset_id", assetId).eq("assigned_to", uid).is("returned_at", null);
        }
        await supabase.from("itam_asset_history").insert({
          asset_id: assetId, action: "returned_to_stock",
          new_value: "In Stock", details: { reason: "denied_by_user" },
          performed_by: user.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Asset returned to stock");
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["denied-assets-dialog"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reassignMutation = useMutation({
    mutationFn: async ({ assetId, newUserId }: { assetId: string; newUserId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("itam_assets").update({
        assigned_to: newUserId, status: ASSET_STATUS.IN_USE, confirmation_status: null,
        updated_at: new Date().toISOString(),
      }).eq("id", assetId);

      const asset = deniedAssets.find((a: any) => a.id === assetId);
      if (asset?.assigned_to) {
        await supabase.from("itam_asset_assignments")
          .update({ returned_at: new Date().toISOString() })
          .eq("asset_id", assetId).eq("assigned_to", asset.assigned_to).is("returned_at", null);
      }
      await supabase.from("itam_asset_assignments").insert({
        asset_id: assetId, assigned_to: newUserId,
        assigned_by: user?.id || null, assigned_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Asset reassigned");
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["denied-assets-dialog"] });
      setReassignAssetId(null);
      setReassignUserId("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resendMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const asset = deniedAssets.find((a: any) => a.id === assetId);
      if (!asset?.assigned_to) throw new Error("No assigned user");
      const { data: usr } = await supabase.from("users").select("id, name, email").eq("id", asset.assigned_to).single();
      if (!usr) throw new Error("User not found");

      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentUser } = await supabase.from("users").select("id").eq("auth_user_id", user?.id).single();

      const { data: confirmation, error: confErr } = await supabase
        .from("itam_asset_confirmations")
        .insert({ user_id: usr.id, requested_by: currentUser?.id || null })
        .select("id, token").single();
      if (confErr) throw confErr;

      await supabase.from("itam_asset_confirmation_items").insert({
        confirmation_id: confirmation.id,
        asset_id: asset.id,
        asset_tag: asset.asset_id || asset.asset_tag || null,
        asset_name: asset.name || null,
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const photoUrl = (asset as any).custom_fields?.photo_url || null;
      await supabase.functions.invoke("send-asset-email", {
        body: {
          templateId: "asset_confirmation",
          recipientEmail: usr.email,
          assets: [{
            asset_tag: asset.asset_id || asset.asset_tag || "N/A",
            description: (asset as any).category?.name || asset.name || "N/A",
            brand: (asset as any).make?.name || "N/A",
            model: (asset as any).model || "N/A",
            serial_number: (asset as any).serial_number || null,
            photo_url: photoUrl,
          }],
          variables: {
            user_name: usr.name || usr.email,
            asset_count: "1",
            confirm_all_url: `${supabaseUrl}/functions/v1/asset-confirmation?action=confirm_all&token=${confirmation.token}`,
            deny_all_url: `${supabaseUrl}/functions/v1/asset-confirmation?action=deny_all&token=${confirmation.token}`,
          },
        },
      });

      // Reset status to pending
      await supabase.from("itam_assets").update({ confirmation_status: "pending" }).eq("id", assetId);
    },
    onSuccess: () => {
      toast.success("Re-confirmation sent");
      queryClient.invalidateQueries({ queryKey: ["denied-assets-dialog"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkReturnMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await returnMutation.mutateAsync(id);
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size} assets returned to stock`);
      setSelectedIds(new Set());
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev => prev.size === deniedAssets.length ? new Set() : new Set(deniedAssets.map((a: any) => a.id)));
  };

  const isPending = returnMutation.isPending || reassignMutation.isPending || resendMutation.isPending || bulkReturnMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Denied Assets
          </DialogTitle>
          <DialogDescription>Assets denied by employees that require immediate action.</DialogDescription>
        </DialogHeader>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-sm">
            <span className="font-medium">{selectedIds.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isPending}
                onClick={() => bulkReturnMutation.mutate([...selectedIds])}>
                {bulkReturnMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                Return All
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          </div>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox checked={deniedAssets.length > 0 && selectedIds.size === deniedAssets.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="text-xs">Asset Tag</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Assigned To</TableHead>
                <TableHead className="text-xs">Denied</TableHead>
                <TableHead className="w-[60px] text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : deniedAssets.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No denied assets</TableCell></TableRow>
              ) : (
                deniedAssets.map((asset: any) => (
                  <TableRow key={asset.id} className={`hover:bg-muted/50 transition-colors ${selectedIds.has(asset.id) ? "bg-primary/5" : ""}`}>
                    <TableCell><Checkbox checked={selectedIds.has(asset.id)} onCheckedChange={() => toggleSelect(asset.id)} /></TableCell>
                    <TableCell>{(asset.asset_id || asset.asset_tag) ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-primary hover:underline cursor-pointer" onClick={() => { onOpenChange(false); navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`); }}>{asset.asset_id || asset.asset_tag}</code> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm font-medium">{asset.name || "—"}</TableCell>
                    <TableCell className="text-sm">{asset.category?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{asset.assigned_to && userMap.get(asset.assigned_to) ? <span className="text-primary hover:underline cursor-pointer" onClick={() => { onOpenChange(false); navigate(`/assets/employees?user=${asset.assigned_to}`); }}>{userMap.get(asset.assigned_to)}</span> : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-[10px]">Denied</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => { onOpenChange(false); navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`); }}>
                            <ExternalLink className="h-4 w-4 mr-2" /> View Asset
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setReassignAssetId(asset.id); setReassignUserId(""); }}>
                            <UserPlus className="h-4 w-4 mr-2" /> Reassign
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => returnMutation.mutate(asset.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" /> Return to Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resendMutation.mutate(asset.id)}>
                            <Send className="h-4 w-4 mr-2" /> Resend Confirmation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Inline reassign */}
        {reassignAssetId && (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
            <span className="text-sm">Reassign to:</span>
            <Select value={reassignUserId} onValueChange={setReassignUserId}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8" disabled={!reassignUserId || reassignMutation.isPending}
              onClick={() => reassignMutation.mutate({ assetId: reassignAssetId, newUserId: reassignUserId })}>
              {reassignMutation.isPending ? "Reassigning..." : "Confirm"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setReassignAssetId(null)}>Cancel</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
