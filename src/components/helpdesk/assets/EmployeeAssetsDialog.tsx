import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Mail, User, MoreHorizontal, ExternalLink, RotateCcw, UserPlus, CheckSquare } from "lucide-react";
import { getStatusLabel } from "@/lib/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";
import { useUsers } from "@/hooks/useUsers";
import { toast } from "sonner";

interface Employee {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  email: string;
  role: string | null;
  status: string | null;
}

interface EmployeeAssetsDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeAssetsDialog({ employee, open, onOpenChange }: EmployeeAssetsDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: allUsers = [] } = useUsers();

  // Sub-dialog states
  const [reassignAsset, setReassignAsset] = useState<any>(null);
  const [reassignUserId, setReassignUserId] = useState("");
  const [returnAsset, setReturnAsset] = useState<any>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"reassign" | "return" | null>(null);
  const [bulkReassignUserId, setBulkReassignUserId] = useState("");

  // Reset selection when employee changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [employee?.id]);

  // Fetch assets assigned to this employee
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["employee-assigned-assets", employee?.id, employee?.auth_user_id],
    queryFn: async () => {
      if (!employee?.id) return [];
      const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
      const orFilter = ids.map(id => `assigned_to.eq.${id}`).join(',');
      const { data } = await supabase
        .from("itam_assets")
        .select("id, name, asset_tag, asset_id, status, category:itam_categories(name)")
        .or(orFilter)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!employee?.id && open,
  });

  // Fetch assignment history
  const { data: history = [] } = useQuery({
    queryKey: ["employee-asset-history", employee?.id, employee?.auth_user_id],
    queryFn: async () => {
      if (!employee?.id) return [];
      const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
      const orFilter = ids.map(id => `assigned_to.eq.${id}`).join(',');
      const { data } = await supabase
        .from("itam_asset_assignments")
        .select(`id, assigned_at, returned_at, asset:itam_assets(id, name, asset_tag, asset_id)`)
        .or(orFilter)
        .not("returned_at", "is", null)
        .order("returned_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!employee?.id && open,
  });

  // Reassign mutation
  const reassignMutation = useMutation({
    mutationFn: async ({ assetId, newUserId }: { assetId: string; newUserId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // Update asset assigned_to
      const { error: updateErr } = await supabase
        .from("itam_assets")
        .update({ assigned_to: newUserId, status: "in_use", updated_at: new Date().toISOString() })
        .eq("id", assetId);
      if (updateErr) throw updateErr;

      // Close old assignment if exists
      if (employee) {
        const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
        for (const uid of ids) {
          await supabase
            .from("itam_asset_assignments")
            .update({ returned_at: new Date().toISOString() })
            .eq("asset_id", assetId)
            .eq("assigned_to", uid)
            .is("returned_at", null);
        }
      }

      // Create new assignment
      await supabase.from("itam_asset_assignments").insert({
        asset_id: assetId,
        assigned_to: newUserId,
        assigned_by: user?.id || null,
        assigned_at: new Date().toISOString(),
      });

      // Resolve names for history
      const fromName = employee?.name || employee?.email || employee?.id || "Unknown";
      const toUser = allUsers.find(u => u.id === newUserId);
      const toName = toUser?.name || toUser?.email || newUserId;

      // Fetch asset tag
      const { data: assetRecord } = await supabase.from("itam_assets").select("asset_tag").eq("id", assetId).single();

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "reassigned",
        old_value: fromName,
        new_value: toName,
        asset_tag: assetRecord?.asset_tag || null,
        details: { from: fromName, to: toName },
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      toast.success("Asset reassigned successfully");
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employee-assigned-assets"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-history"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
      setReassignAsset(null);
      setReassignUserId("");
    },
    onError: (err: Error) => toast.error("Failed to reassign: " + err.message),
  });

  // Return to stock mutation
  const returnMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error: updateErr } = await supabase
        .from("itam_assets")
        .update({ 
          assigned_to: null, 
          status: "available", 
          updated_at: new Date().toISOString(),
          checked_out_to: null,
          checked_out_at: null,
          expected_return_date: null,
          check_out_notes: null,
        })
        .eq("id", assetId);
      if (updateErr) throw updateErr;

      // Close assignment record
      if (employee) {
        const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
        for (const uid of ids) {
          await supabase
            .from("itam_asset_assignments")
            .update({ returned_at: new Date().toISOString() })
            .eq("asset_id", assetId)
            .eq("assigned_to", uid)
            .is("returned_at", null);
        }
      }

      // Log to history with resolved names
      const { data: { user } } = await supabase.auth.getUser();
      const returnedFromName = employee?.name || employee?.email || employee?.id || "Unknown";
      const { data: assetRec } = await supabase.from("itam_assets").select("asset_tag").eq("id", assetId).single();

      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "returned_to_stock",
        old_value: returnedFromName,
        new_value: "Available",
        asset_tag: assetRec?.asset_tag || null,
        details: { returned_from: returnedFromName },
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      toast.success("Asset returned to stock");
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employee-assigned-assets"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-history"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
      setReturnAsset(null);
    },
    onError: (err: Error) => toast.error("Failed to return: " + err.message),
  });

  // Bulk return mutation — direct DB calls to avoid N toasts
  const bulkReturnMutation = useMutation({
    mutationFn: async (assetIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      for (const assetId of assetIds) {
        await supabase.from("itam_assets").update({
          assigned_to: null, status: "available", updated_at: new Date().toISOString(),
          checked_out_to: null, checked_out_at: null, expected_return_date: null, check_out_notes: null,
        }).eq("id", assetId);

        if (employee) {
          const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
          for (const uid of ids) {
            await supabase.from("itam_asset_assignments")
              .update({ returned_at: new Date().toISOString() })
              .eq("asset_id", assetId).eq("assigned_to", uid).is("returned_at", null);
          }
        }

        const returnFromName = employee?.name || employee?.email || employee?.id || "Unknown";
        await supabase.from("itam_asset_history").insert({
          asset_id: assetId, action: "returned_to_stock",
          old_value: returnFromName, new_value: "Available",
          details: { returned_from: returnFromName }, performed_by: user?.id,
        });
      }
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size} assets returned to stock`);
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employee-assigned-assets"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-history"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
      setSelectedIds(new Set());
      setBulkAction(null);
    },
    onError: (err: Error) => toast.error("Bulk return failed: " + err.message),
  });

  // Bulk reassign mutation — direct DB calls to avoid N toasts
  const bulkReassignMutation = useMutation({
    mutationFn: async ({ assetIds, newUserId }: { assetIds: string[]; newUserId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      for (const assetId of assetIds) {
        await supabase.from("itam_assets")
          .update({ assigned_to: newUserId, status: "in_use", updated_at: new Date().toISOString() })
          .eq("id", assetId);

        if (employee) {
          const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
          for (const uid of ids) {
            await supabase.from("itam_asset_assignments")
              .update({ returned_at: new Date().toISOString() })
              .eq("asset_id", assetId).eq("assigned_to", uid).is("returned_at", null);
          }
        }

        await supabase.from("itam_asset_assignments").insert({
          asset_id: assetId, assigned_to: newUserId,
          assigned_by: user?.id || null, assigned_at: new Date().toISOString(),
        });

        const bulkFromName = employee?.name || employee?.email || employee?.id || "Unknown";
        const bulkToUser = allUsers.find(u => u.id === newUserId);
        const bulkToName = bulkToUser?.name || bulkToUser?.email || newUserId;
        await supabase.from("itam_asset_history").insert({
          asset_id: assetId, action: "reassigned",
          old_value: bulkFromName, new_value: bulkToName,
          details: { from: bulkFromName, to: bulkToName }, performed_by: user?.id,
        });
      }
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size} assets reassigned`);
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employee-assigned-assets"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-history"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
      setSelectedIds(new Set());
      setBulkAction(null);
      setBulkReassignUserId("");
    },
    onError: (err: Error) => toast.error("Bulk reassign failed: " + err.message),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === assets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.map((a: any) => a.id)));
    }
  };

  const selectedAssets = useMemo(() => assets.filter((a: any) => selectedIds.has(a.id)), [assets, selectedIds]);

  if (!employee) return null;

  const initials = employee.name
    ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : employee.email[0].toUpperCase();

  // Deterministic avatar color
  const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  ];
  const avatarName = employee.name || employee.email;
  let hash = 0;
  for (let i = 0; i < avatarName.length; i++) hash = avatarName.charCodeAt(i) + ((hash << 5) - hash);
  const avatarColor = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];

  const statusColor: Record<string, string> = {
    available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    in_use: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    maintenance: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    disposed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) setSelectedIds(new Set()); onOpenChange(o); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className={`font-medium ${avatarColor}`}>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{employee.name || "Unknown User"}</p>
                <p className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {employee.email}
                </p>
              </div>
            </DialogTitle>
            <DialogDescription>View and manage assets assigned to this employee.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            {/* Employee Details */}
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-sm capitalize">
                <User className="h-3 w-3 text-muted-foreground" />
                {employee.role || "user"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm">
                <span className={`h-2 w-2 rounded-full ${employee.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
                {employee.status === "active" ? "Active" : "Inactive"}
              </span>
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                {assets.length} asset{assets.length !== 1 ? 's' : ''} assigned
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{selectedIds.size} asset{selectedIds.size !== 1 ? 's' : ''} selected</span>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setBulkAction("reassign")}>
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Reassign All
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setBulkAction("return")}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Return All
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Currently Assigned Assets */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Currently Assigned Assets</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[40px]">
                        {assets.length > 0 && (
                          <Checkbox
                            checked={assets.length > 0 && selectedIds.size === assets.length}
                            onCheckedChange={toggleAll}
                            aria-label="Select all"
                          />
                        )}
                      </TableHead>
                      
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground">Name</TableHead>
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground">Asset Tag</TableHead>
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground">Category</TableHead>
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
                      <TableHead className="w-[60px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                       <TableCell colSpan={6} className="text-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : assets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No assets currently assigned</p>
                          <Button size="sm" variant="outline" className="mt-3" onClick={() => {
                            onOpenChange(false);
                            navigate(`/assets/checkout?user=${employee?.id}`);
                          }}>
                            <Package className="h-3.5 w-3.5 mr-1.5" />
                            Assign an Asset
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      assets.map((asset: any) => (
                        <TableRow key={asset.id} className={selectedIds.has(asset.id) ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(asset.id)}
                              onCheckedChange={() => toggleSelect(asset.id)}
                              aria-label={`Select ${asset.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm">{asset.name || "—"}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {asset.asset_id || asset.asset_tag || "—"}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">{asset.category?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-xs ${statusColor[asset.status] || ""}`}>
                              {getStatusLabel(asset.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => {
                                  onOpenChange(false);
                                  navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`);
                                }}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Asset
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setReassignAsset(asset); setReassignUserId(""); }}>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Reassign to User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setReturnAsset(asset)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Return to Stock
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
            </div>

            {/* Recent Return History */}
            {history.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Recent Return History</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Asset</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Assigned</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Returned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item: any) => (
                        <TableRow key={item.id} className="text-muted-foreground">
                          <TableCell>
                            <p className="text-sm">{item.asset?.name}</p>
                            <p className="text-xs">{item.asset?.asset_id || item.asset?.asset_tag}</p>
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.assigned_at 
                              ? new Date(item.assigned_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.returned_at 
                              ? new Date(item.returned_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={!!reassignAsset} onOpenChange={(open) => { if (!open) setReassignAsset(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Asset</DialogTitle>
            <DialogDescription>
              Reassign <span className="font-medium">{reassignAsset?.name}</span> to another user.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={reassignUserId} onValueChange={setReassignUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {allUsers
                  .filter(u => u.id !== employee?.id && u.auth_user_id !== employee?.auth_user_id)
                  .map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email} {u.role ? `(${u.role})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignAsset(null)}>Cancel</Button>
            <Button
              disabled={!reassignUserId || reassignMutation.isPending}
              onClick={() => reassignAsset && reassignMutation.mutate({ assetId: reassignAsset.id, newUserId: reassignUserId })}
            >
              {reassignMutation.isPending ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return to Stock Confirmation */}
      <ConfirmDialog
        open={!!returnAsset}
        onOpenChange={(open) => { if (!open) setReturnAsset(null); }}
        onConfirm={() => returnAsset && returnMutation.mutate(returnAsset.id)}
        title="Return to Stock"
        description={`Return "${returnAsset?.name}" to available stock? This will unassign it from ${employee?.name || employee?.email}.`}
        confirmText={returnMutation.isPending ? "Returning..." : "Return to Stock"}
        variant="destructive"
      />

      {/* Bulk Reassign Dialog */}
      <Dialog open={bulkAction === "reassign"} onOpenChange={(o) => { if (!o) { setBulkAction(null); setBulkReassignUserId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Reassign Assets</DialogTitle>
            <DialogDescription>
              Reassign {selectedIds.size} selected asset{selectedIds.size !== 1 ? 's' : ''} to another user.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
              {selectedAssets.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">({a.asset_id || a.asset_tag})</span>
                </div>
              ))}
            </div>
            <Select value={bulkReassignUserId} onValueChange={setBulkReassignUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {allUsers
                  .filter(u => u.id !== employee?.id && u.auth_user_id !== employee?.auth_user_id)
                  .map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email} {u.role ? `(${u.role})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkAction(null); setBulkReassignUserId(""); }}>Cancel</Button>
            <Button
              disabled={!bulkReassignUserId || bulkReassignMutation.isPending}
              onClick={() => bulkReassignMutation.mutate({ assetIds: Array.from(selectedIds), newUserId: bulkReassignUserId })}
            >
              {bulkReassignMutation.isPending ? "Reassigning..." : `Reassign ${selectedIds.size} Asset${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Return Confirmation */}
      <ConfirmDialog
        open={bulkAction === "return"}
        onOpenChange={(o) => { if (!o) setBulkAction(null); }}
        onConfirm={() => bulkReturnMutation.mutate(Array.from(selectedIds))}
        title="Bulk Return to Stock"
        description={`Return ${selectedIds.size} selected asset${selectedIds.size !== 1 ? 's' : ''} to available stock? This will unassign them from ${employee?.name || employee?.email}.`}
        confirmText={bulkReturnMutation.isPending ? "Returning..." : `Return ${selectedIds.size} Asset${selectedIds.size !== 1 ? 's' : ''}`}
        variant="destructive"
      />
    </>
  );
}
