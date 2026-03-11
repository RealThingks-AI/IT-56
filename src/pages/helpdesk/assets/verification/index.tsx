import { useState, useMemo, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { ShieldCheck, Clock, XCircle, Package, CheckCircle2, Send, Search, FileDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatCard } from "@/components/helpdesk/assets/StatCard";
import { SortableTableHeader } from "@/components/helpdesk/SortableTableHeader";
import { PaginationControls } from "@/components/helpdesk/assets/PaginationControls";
import { useSortableAssets } from "@/hooks/assets/useSortableAssets";
import { useUsersLookup } from "@/hooks/useUsersLookup";
import { toast } from "sonner";
import { useVerificationConfig } from "@/hooks/assets/useVerificationConfig";
import { VerificationSettingsDialog } from "@/components/helpdesk/assets/VerificationSettingsDialog";
import { getStatusBadgeColor, getStatusLabel } from "@/lib/assets/assetStatusUtils";
import { exportCSV } from "@/lib/assets/csvExportUtils";

type StatusFilter = "all" | "confirmed" | "denied" | "pending" | "overdue";

export default function AssetVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { config } = useVerificationConfig();
  const verificationPeriod = config.verification_period;

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setPortalTarget(document.getElementById("module-header-portal"));
  }, []);

  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["verification-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_assets")
        .select("id, asset_id, asset_tag, name, status, assigned_to, confirmation_status, last_confirmed_at, checked_out_to, serial_number, model, make:itam_makes!make_id(name), category:itam_categories(name), custom_fields")
        .eq("is_active", true)
        .eq("is_hidden", false)
        .order("name")
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000
  });

  const { resolveUserName } = useUsersLookup();

  const getVerificationStatus = (asset: any): "confirmed" | "denied" | "overdue" | "pending" => {
    const status = asset.confirmation_status;
    if (status === "denied") return "denied";
    // Email sent, awaiting user response
    if (status === "pending") return "pending";
    // Confirmed and within verification period
    if (status === "confirmed") {
      if (asset.last_confirmed_at && differenceInDays(new Date(), new Date(asset.last_confirmed_at)) <= verificationPeriod) return "confirmed";
      return "overdue"; // confirmation expired
    }
    // "unconfirmed", null, or any other value → never verified = overdue
    return "overdue";
  };

  const enriched = useMemo(() => assets.map((a) => ({
    ...a,
    verificationStatus: getVerificationStatus(a),
    assignedName: a.assigned_to ? resolveUserName(a.assigned_to) || "Unknown User" : null
  })), [assets, resolveUserName]);

  const stats = useMemo(() => {
    const s = { total: enriched.length, confirmed: 0, denied: 0, overdue: 0, pending: 0 };
    enriched.forEach((a) => { s[a.verificationStatus]++; });
    return s;
  }, [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter !== "all") list = list.filter((a) => a.verificationStatus === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        (a.name || "").toLowerCase().includes(q) ||
        (a.asset_tag || "").toLowerCase().includes(q) ||
        (a.assignedName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, filter, search]);

  const getColumnValue = useCallback((item: any, column: string): string | number => {
    switch (column) {
      case "asset_tag": return item.asset_tag || item.asset_id || "";
      case "name": return item.name || "";
      case "status": return item.status || "";
      case "assigned_to": return item.assignedName || "";
      case "verification": return item.verificationStatus || "";
      case "last_verified": return item.last_confirmed_at || "";
      default: return "";
    }
  }, []);

  const { sortedData, sortConfig, handleSort } = useSortableAssets(filtered, getColumnValue);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = sortedData.slice((safePage - 1) * pageSize, safePage * pageSize);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["verification-assets"] });
    queryClient.invalidateQueries({ queryKey: ["itam-assets"] });
    queryClient.invalidateQueries({ queryKey: ["itam-assets-dashboard-full"] });
  };

  const toggleAll = () => {
    const pageIds = paginatedData.map((a) => a.id);
    const allSelected = pageIds.every((id) => selected.includes(id));
    if (allSelected) {
      setSelected(selected.filter((id) => !pageIds.includes(id)));
    } else {
      setSelected([...new Set([...selected, ...pageIds])]);
    }
  };

  const pageAllSelected = paginatedData.length > 0 && paginatedData.every((a) => selected.includes(a.id));
  const pageSomeSelected = paginatedData.length > 0 && paginatedData.some((a) => selected.includes(a.id)) && !pageAllSelected;

  // --- Bulk handlers ---
  const handleBulkVerifyStock = async () => {
    const toVerify = filtered.filter((a) => selected.includes(a.id));
    if (!toVerify.length) { toast.error("No assets selected"); return; }
    setBulkLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const asset of toVerify) {
        await supabase.from("itam_assets").update({
          confirmation_status: "confirmed",
          last_confirmed_at: new Date().toISOString()
        }).eq("id", asset.id);
        await supabase.from("itam_asset_history").insert({
          asset_id: asset.id, action: "stock_verified",
          details: { verified_by: user?.id, method: "bulk_admin" },
          performed_by: user?.id
        });
      }
      toast.success(`${toVerify.length} asset(s) verified`);
      setSelected([]); invalidateAll();
    } catch (err) { console.error(err); toast.error("Bulk verification failed"); } finally { setBulkLoading(false); }
  };

  const handleBulkSendConfirmation = async () => {
    const assigned = filtered.filter((a) => selected.includes(a.id) && a.assigned_to);
    if (!assigned.length) { toast.error("No assigned assets selected"); return; }
    setBulkLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentUser } = await supabase.from("users").select("id").eq("auth_user_id", user?.id).single();
      const byUser: Record<string, typeof assigned> = {};
      assigned.forEach((a) => { if (!byUser[a.assigned_to]) byUser[a.assigned_to] = []; byUser[a.assigned_to].push(a); });
      const supabaseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
      for (const [userId, userAssets] of Object.entries(byUser)) {
        const { data: recipientUser } = await supabase.from("users").select("email, name").eq("id", userId).maybeSingle();
        if (!recipientUser?.email) continue;
        const { data: confirmation, error: confErr } = await supabase.from("itam_asset_confirmations").insert({ user_id: userId, requested_by: currentUser?.id || null }).select("id, token").single();
        if (confErr) throw confErr;
        const items = userAssets.map((a) => ({ confirmation_id: confirmation.id, asset_id: a.id, asset_tag: a.asset_tag || a.asset_id || null, asset_name: a.name || null }));
        const { data: insertedItems, error: itemsErr } = await supabase.from("itam_asset_confirmation_items").insert(items).select("id, asset_id");
        if (itemsErr) throw itemsErr;
        const itemIdMap = new Map((insertedItems || []).map((it: any) => [it.asset_id, it.id]));
        const confirmAllUrl = `${supabaseUrl}/functions/v1/asset-confirmation?action=confirm_all&token=${confirmation.token}`;
        const denyAllUrl = `${supabaseUrl}/functions/v1/asset-confirmation?action=deny_all&token=${confirmation.token}`;
        const emailAssets = userAssets.map((a) => {
          const itemId = itemIdMap.get(a.id);
          const photoUrl = (a as any).custom_fields?.photo_url || null;
          return {
            asset_tag: a.asset_tag || a.asset_id || "N/A",
            description: (a.category as any)?.name || a.name || "N/A",
            brand: (a as any).make?.name || "N/A",
            model: (a as any).model || "N/A",
            serial_number: (a as any).serial_number || null,
            photo_url: photoUrl,
            confirm_url: itemId ? `${supabaseUrl}/functions/v1/asset-confirmation?action=confirm_item&token=${confirmation.token}&item_id=${itemId}` : undefined,
            deny_url: itemId ? `${supabaseUrl}/functions/v1/asset-confirmation?action=deny_item&token=${confirmation.token}&item_id=${itemId}` : undefined
          };
        });
        await supabase.functions.invoke("send-asset-email", {
          body: {
            templateId: "asset_confirmation", recipientEmail: recipientUser.email, assets: emailAssets,
            variables: { user_name: recipientUser.name || recipientUser.email, asset_count: String(userAssets.length), confirm_all_url: confirmAllUrl, deny_all_url: denyAllUrl }
          }
        });
      }
      for (const a of assigned) {
        const { error: updateErr } = await supabase.from("itam_assets").update({ confirmation_status: "pending" }).eq("id", a.id);
        if (updateErr) console.error("Failed to update confirmation_status for", a.id, updateErr);
      }
      toast.success(`Confirmation sent for ${assigned.length} asset(s)`);
      setSelected([]); invalidateAll();
    } catch (err) { console.error(err); toast.error("Failed to send confirmations"); } finally { setBulkLoading(false); }
  };

  const handleVerifySingle = async (assetId: string) => {
    setRowLoading(prev => ({ ...prev, [assetId]: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("itam_assets").update({ confirmation_status: "confirmed", last_confirmed_at: new Date().toISOString() }).eq("id", assetId);
      await supabase.from("itam_asset_history").insert({ asset_id: assetId, action: "stock_verified", details: { verified_by: user?.id, method: "admin_manual" }, performed_by: user?.id });
      toast.success("Asset verified"); invalidateAll();
    } catch { toast.error("Failed to verify"); } finally { setRowLoading(prev => ({ ...prev, [assetId]: false })); }
  };

  const handleSendSingle = async (asset: any) => {
    setRowLoading(prev => ({ ...prev, [asset.id]: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentUser } = await supabase.from("users").select("id").eq("auth_user_id", user?.id).single();
      const { data: recipientUser } = await supabase.from("users").select("email, name").eq("id", asset.assigned_to).maybeSingle();
      if (!recipientUser?.email) { toast.error("No email found for assigned user"); return; }
      const { data: confirmation, error: confErr } = await supabase.from("itam_asset_confirmations").insert({ user_id: asset.assigned_to, requested_by: currentUser?.id || null }).select("id, token").single();
      if (confErr) throw confErr;
      const { data: insertedItems, error: itemsErr } = await supabase.from("itam_asset_confirmation_items").insert([{ confirmation_id: confirmation.id, asset_id: asset.id, asset_tag: asset.asset_tag || asset.asset_id || null, asset_name: asset.name || null }]).select("id, asset_id");
      if (itemsErr) throw itemsErr;
      const itemId = insertedItems?.[0]?.id;
      const supabaseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
      const confirmAllUrl = `${supabaseUrl}/functions/v1/asset-confirmation?action=confirm_all&token=${confirmation.token}`;
      const denyAllUrl = `${supabaseUrl}/functions/v1/asset-confirmation?action=deny_all&token=${confirmation.token}`;
      const photoUrl = (asset as any).custom_fields?.photo_url || null;
      const emailAssets = [{ asset_tag: asset.asset_tag || asset.asset_id || "N/A", description: (asset.category as any)?.name || asset.name || "N/A", brand: (asset as any).make?.name || "N/A", model: (asset as any).model || "N/A", serial_number: (asset as any).serial_number || null, photo_url: photoUrl, confirm_url: itemId ? `${supabaseUrl}/functions/v1/asset-confirmation?action=confirm_item&token=${confirmation.token}&item_id=${itemId}` : undefined, deny_url: itemId ? `${supabaseUrl}/functions/v1/asset-confirmation?action=deny_item&token=${confirmation.token}&item_id=${itemId}` : undefined }];
      await supabase.functions.invoke("send-asset-email", { body: { templateId: "asset_confirmation", recipientEmail: recipientUser.email, assets: emailAssets, variables: { user_name: recipientUser.name || recipientUser.email, asset_count: "1", confirm_all_url: confirmAllUrl, deny_all_url: denyAllUrl } } });
      const { error: updateErr } = await supabase.from("itam_assets").update({ confirmation_status: "pending" }).eq("id", asset.id);
      if (updateErr) { console.error("Failed to update confirmation_status", updateErr); toast.error("Email sent but status update failed"); }
      toast.success("Confirmation sent"); invalidateAll();
    } catch { toast.error("Failed to send"); } finally { setRowLoading(prev => ({ ...prev, [asset.id]: false })); }
  };

  const verificationBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      confirmed: { className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", label: "Confirmed" },
      denied: { className: "bg-rose-500/15 text-rose-600 border-rose-500/30", label: "Denied" },
      overdue: { className: "bg-amber-500/15 text-amber-600 border-amber-500/30", label: "Overdue" },
      pending: { className: "bg-muted text-muted-foreground border-border", label: "Pending" }
    };
    const c = map[status] || map.pending;
    return <Badge variant="outline" className={cn("text-[11px] px-1.5 py-0", c.className)}>{c.label}</Badge>;
  };

  const bulkVerifyCount = selected.length;
  const bulkSendCount = selected.filter((id) => enriched.find((x) => x.id === id)?.assigned_to).length;

  // Header portal content
  const headerContent = (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search tag, name, assigned..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-7 pr-8 h-7 w-[220px] text-xs"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {selected.length > 0 && (
        <>
          <Button size="sm" variant="outline" onClick={handleBulkVerifyStock} disabled={bulkLoading} className="h-7 text-xs gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verify Stock ({bulkVerifyCount})
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkSendConfirmation} disabled={bulkLoading} className="h-7 text-xs gap-1">
            <Send className="h-3.5 w-3.5" />
            Send Confirmation ({bulkSendCount})
          </Button>
        </>
      )}
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportCSV(filtered.map(a => ({
          "Asset Tag": a.asset_tag || a.asset_id || "",
          "Name": a.name || "",
          "Status": a.status || "",
          "Assigned To": a.assignedName || "",
          "Verification": a.verificationStatus || "",
          "Last Verified": a.last_confirmed_at ? format(new Date(a.last_confirmed_at), "yyyy-MM-dd") : "",
        })), "verification")}>
          <FileDown className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)} className="h-7 text-xs gap-1">
          Advanced
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {portalTarget && createPortal(headerContent, portalTarget)}

      {/* Stat Cards */}
      <div className="shrink-0 p-3 pb-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <StatCard icon={Package} value={stats.total} label="Total Assets" colorClass="bg-primary/10 text-primary" onClick={() => setFilter("all")} active={filter === "all"} />
          <StatCard icon={CheckCircle2} value={stats.confirmed} label="Confirmed" colorClass="bg-emerald-500/10 text-emerald-600" onClick={() => setFilter("confirmed")} active={filter === "confirmed"} />
          <StatCard icon={XCircle} value={stats.denied} label="Denied" colorClass="bg-destructive/10 text-destructive" onClick={() => setFilter("denied")} active={filter === "denied"} />
          <StatCard icon={Clock} value={stats.overdue} label="Overdue" colorClass="bg-amber-500/10 text-amber-600" onClick={() => setFilter("overdue")} active={filter === "overdue"} />
          <StatCard icon={ShieldCheck} value={stats.pending} label="Pending" colorClass="bg-muted text-muted-foreground" onClick={() => setFilter("pending")} active={filter === "pending"} />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2.5">
        <div className="flex-1 flex flex-col overflow-hidden rounded-md border">
          <ScrollArea className="flex-1">
            <Table wrapperClassName="border-0 rounded-none overflow-visible">
              <colgroup>
                <col style={{ width: "36px" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "auto" }} />
              </colgroup>
              <TableHeader className="sticky top-0 z-10 bg-muted shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[36px]">
                    <Checkbox
                      className="h-3.5 w-3.5"
                      checked={pageAllSelected ? true : pageSomeSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <SortableTableHeader column="asset_tag" label="Asset Tag" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHeader column="name" label="Name" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHeader column="status" label="Status" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHeader column="assigned_to" label="Assigned To" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHeader column="verification" label="Verification" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableHeader column="last_verified" label="Last Verified" sortConfig={sortConfig} onSort={handleSort} />
                  <TableHead className="w-[90px] text-center" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-1"><Skeleton className="h-3.5 w-3.5" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center">
                        <ShieldCheck className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No assets found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((asset) => {
                    const isRowBusy = !!rowLoading[asset.id];
                    const isSelected = selected.includes(asset.id);
                    return (
                      <TableRow
                        key={asset.id}
                        className={cn(
                          "transition-colors",
                          isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
                        )}
                      >
                        <TableCell className="py-1">
                          <Checkbox
                            className="h-3.5 w-3.5"
                            checked={isSelected}
                            onCheckedChange={(c) => setSelected(c ? [...selected, asset.id] : selected.filter((id) => id !== asset.id))}
                          />
                        </TableCell>
                        <TableCell className="py-1">
                          <span className="text-sm text-primary hover:underline cursor-pointer" onClick={() => navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`)}>
                            {asset.asset_tag || asset.asset_id}
                          </span>
                        </TableCell>
                        <TableCell className="py-1 text-sm truncate">{asset.name}</TableCell>
                        <TableCell className="py-1">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border", getStatusBadgeColor(asset.status))}>
                            {getStatusLabel(asset.status)}
                          </span>
                        </TableCell>
                        <TableCell className="py-1 text-sm">
                          {asset.assigned_to && asset.assignedName ? (
                            <span className="text-primary hover:underline cursor-pointer" onClick={() => navigate(`/assets/employees?user=${asset.assigned_to}`)}>{asset.assignedName}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1">{verificationBadge(asset.verificationStatus)}</TableCell>
                        <TableCell className="py-1 text-xs text-muted-foreground">
                          {asset.last_confirmed_at ? format(new Date(asset.last_confirmed_at), "dd MMM yyyy") : "Never"}
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" className="h-6 px-1.5 text-xs gap-1" onClick={() => handleVerifySingle(asset.id)} disabled={isRowBusy}>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Verify
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Verify Stock</TooltipContent>
                            </Tooltip>
                            {asset.assigned_to && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" className="h-6 px-1.5 text-xs gap-1" onClick={() => handleSendSingle(asset)} disabled={isRowBusy}>
                                    <Send className="h-3.5 w-3.5" />
                                    Send
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Send Confirmation</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          <PaginationControls
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={sortedData.length}
            itemsPerPage={pageSize}
            onPageChange={setCurrentPage}
            showRowsPerPage
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
      <VerificationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
