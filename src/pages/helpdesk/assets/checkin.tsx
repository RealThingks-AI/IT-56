import { useState, useDeferredValue, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  ArrowDownToLine,
  X,
  SearchX,
  Loader2,
  CheckCircle2,
  CalendarIcon,
  AlertCircle,
  PackageOpen,
} from "lucide-react";
import { cn, sanitizeSearchInput } from "@/lib/utils";
import { useUsers } from "@/hooks/useUsers";
import { useUISettings } from "@/hooks/useUISettings";
import { getUserDisplayName } from "@/lib/userUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";
import { SortableTableHeader, type SortConfig } from "@/components/helpdesk/SortableTableHeader";

interface CheckinRow {
  rowId: string;
  assignmentId: string | null;
  assetUuid: string;
  assetName: string;
  assetTag: string | null;
  assetCode: string;
  photoUrl?: string | null;
  assignedTo: string | null;
  assignedAt: string | null;
  source: "assignment" | "asset";
}

const FALLBACK_NAV = "/assets/allassets";

const AssetThumbnail = ({ url, name, onClick }: { url?: string | null; name?: string; onClick?: () => void }) => {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div className="h-7 w-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
        <PackageOpen className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name || "Asset"}
      className="h-7 w-7 rounded object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
      onError={() => setError(true)}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      loading="lazy"
    />
  );
};

const CheckinPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedCache, setSelectedCache] = useState<Map<string, CheckinRow>>(new Map());
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "assignedAt", direction: "desc" });

  const { uiSettings, updateUISettings } = useUISettings();
  const { data: users = [] } = useUsers();

  const hasLoadedPrefs = useRef(false);
  useEffect(() => {
    if (!hasLoadedPrefs.current && uiSettings?.checkinPreferences?.lastNotes) {
      setNotes(uiSettings.checkinPreferences.lastNotes);
      hasLoadedPrefs.current = true;
    }
  }, [uiSettings?.checkinPreferences?.lastNotes]);

  const getPhotoUrl = (asset: any): string | null => asset?.custom_fields?.photo_url || null;

  const getUserName = useCallback((userId: string | null) => {
    if (!userId) return "—";
    const user = users.find((u) => u.id === userId);
    return getUserDisplayName(user) || user?.email || userId;
  }, [users]);

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["itam-checkin-rows", deferredSearch],
    queryFn: async (): Promise<CheckinRow[]> => {
      const [activeAssignmentsRes, inUseAssetsRes] = await Promise.all([
        supabase
          .from("itam_asset_assignments")
          .select("id, asset_id, assigned_to, assigned_at, asset:itam_assets(id, name, asset_tag, asset_id, custom_fields)")
          .is("returned_at", null)
          .order("assigned_at", { ascending: false })
          .limit(5000),
        supabase
          .from("itam_assets")
          .select("id, name, asset_tag, asset_id, custom_fields, assigned_to, checked_out_to, checked_out_at, updated_at")
          .eq("is_active", true)
          .or("status.eq.in_use,checked_out_to.not.is.null")
          .order("checked_out_at", { ascending: false })
          .limit(5000),
      ]);

      if (activeAssignmentsRes.error) throw activeAssignmentsRes.error;
      if (inUseAssetsRes.error) throw inUseAssetsRes.error;

      const assignmentRows: CheckinRow[] = (activeAssignmentsRes.data || []).map((a: any) => ({
        rowId: a.id,
        assignmentId: a.id,
        assetUuid: a.asset?.id || a.asset_id,
        assetName: a.asset?.name || "Unnamed asset",
        assetTag: a.asset?.asset_tag || null,
        assetCode: a.asset?.asset_id || "",
        photoUrl: getPhotoUrl(a.asset),
        assignedTo: a.assigned_to,
        assignedAt: a.assigned_at,
        source: "assignment",
      }));

      const assetsAlreadyInAssignments = new Set(assignmentRows.map((a) => a.assetUuid));

      const inferredRows: CheckinRow[] = (inUseAssetsRes.data || [])
        .filter((asset: any) => !assetsAlreadyInAssignments.has(asset.id))
        .map((asset: any) => ({
          rowId: `asset-${asset.id}`,
          assignmentId: null,
          assetUuid: asset.id,
          assetName: asset.name || "Unnamed asset",
          assetTag: asset.asset_tag || null,
          assetCode: asset.asset_id || "",
          photoUrl: getPhotoUrl(asset),
          assignedTo: asset.checked_out_to || asset.assigned_to,
          assignedAt: asset.checked_out_at || asset.updated_at,
          source: "asset",
        }));

      let mergedRows = [...assignmentRows, ...inferredRows];

      if (deferredSearch) {
        const term = sanitizeSearchInput(deferredSearch).toLowerCase();
        mergedRows = mergedRows.filter((r) => {
          const userName = getUserName(r.assignedTo).toLowerCase();
          return (
            r.assetName.toLowerCase().includes(term) ||
            (r.assetTag || "").toLowerCase().includes(term) ||
            r.assetCode.toLowerCase().includes(term) ||
            userName.includes(term)
          );
        });
      }

      return mergedRows.sort((a, b) => {
        const aTs = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
        const bTs = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
        return bTs - aTs;
      });
    },
  });

  // Sort handler
  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column
        ? prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc"
        : "asc",
    }));
  }, []);

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortConfig.direction) return rows;
    const sorted = [...rows].sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortConfig.column) {
        case "asset_tag": aVal = a.assetTag || a.assetCode || ""; bVal = b.assetTag || b.assetCode || ""; break;
        case "name": aVal = a.assetName || ""; bVal = b.assetName || ""; break;
        case "assignedTo":
          aVal = getUserName(a.assignedTo); bVal = getUserName(b.assignedTo); break;
        case "assignedAt":
          aVal = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
          bVal = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
          break;
        default: aVal = ""; bVal = "";
      }
      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: "base" });
      }
      return sortConfig.direction === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [rows, sortConfig, getUserName]);

  const allSelected = sortedRows.length > 0 && sortedRows.every((r) => selectedRows.includes(r.rowId));
  const someSelected = sortedRows.some((r) => selectedRows.includes(r.rowId));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows(sortedRows.map((r) => r.rowId));
      setSelectedCache(new Map(sortedRows.map((r) => [r.rowId, r])));
    }
  }, [allSelected, sortedRows]);

  // BUG FIX: Use functional updater to avoid stale closure on selectedRows
  const toggleRow = useCallback((row: CheckinRow | string) => {
    const id = typeof row === "string" ? row : row.rowId;
    setSelectedRows((prev) => {
      const isDeselecting = prev.includes(id);
      if (isDeselecting) return prev.filter((x) => x !== id);
      // Cache on select
      if (typeof row !== "string") {
        setSelectedCache((prevCache) => {
          const next = new Map(prevCache);
          next.set(id, row);
          return next;
        });
      }
      return [...prev, id];
    });
  }, []);

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (selectedRows.length === 0) throw new Error("Please select at least one asset");

      const selectedItems = selectedRows
        .map((id) => selectedCache.get(id))
        .filter(Boolean) as CheckinRow[];

      const assetIds = [...new Set(selectedItems.map((item) => item.assetUuid))];
      const assignmentIds = selectedItems
        .map((item) => item.assignmentId)
        .filter((id): id is string => !!id);

      const now = checkInDate.toISOString();

      if (assignmentIds.length > 0) {
        const { error: assignmentError } = await supabase
          .from("itam_asset_assignments")
          .update({ returned_at: now, notes: notes || null })
          .in("id", assignmentIds);
        if (assignmentError) throw assignmentError;
      }

      // Create pre-closed assignment records for orphan assets (source: "asset" with no assignment record)
      const orphanItems = selectedItems.filter((item) => item.source === "asset" && !item.assignmentId);
      if (orphanItems.length > 0) {
        const orphanAssignments = orphanItems.map((item) => ({
          asset_id: item.assetUuid,
          assigned_to: item.assignedTo || "00000000-0000-0000-0000-000000000000",
          assigned_at: item.assignedAt || now,
          returned_at: now,
          notes: notes || "Bulk check-in (retroactive assignment record)",
        }));
        const { error: orphanError } = await supabase.from("itam_asset_assignments").insert(orphanAssignments);
        if (orphanError) console.error("Failed to create orphan assignment records:", orphanError);
      }

      const { error: updateError } = await supabase
        .from("itam_assets")
        .update({
          status: ASSET_STATUS.AVAILABLE,
          assigned_to: null,
          checked_out_to: null,
          checked_out_at: null,
          expected_return_date: null,
          check_out_notes: null,
        })
        .in("id", assetIds);
      if (updateError) throw updateError;

      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user;

      const { data: assetRecords, error: assetFetchError } = await supabase
        .from("itam_assets")
        .select("id, asset_tag")
        .in("id", assetIds);
      if (assetFetchError) throw assetFetchError;

      // Resolve previous user names for history
      const prevUserIds = [...new Set(selectedItems.map(item => item.assignedTo).filter(Boolean))] as string[];
      let prevUserMap = new Map<string, string>();
      if (prevUserIds.length > 0) {
        const { data: prevUsers } = await supabase.from("users").select("id, name, email").in("id", prevUserIds);
        prevUserMap = new Map((prevUsers || []).map(u => [u.id, u.name || u.email || u.id]));
      }

      const historyEntries = (assetRecords || []).map((asset) => {
        const item = selectedItems.find(si => si.assetUuid === asset.id);
        const prevUserName = item?.assignedTo ? (prevUserMap.get(item.assignedTo) || item.assignedTo) : "Unknown";
        return {
          asset_id: asset.id,
          action: "checked_in",
          old_value: prevUserName,
          new_value: "Available",
          asset_tag: asset.asset_tag,
          details: { notes, returned_at: now, returned_from: prevUserName },
          performed_by: currentUser?.id,
        };
      });

      if (historyEntries.length > 0) {
        const { error: historyError } = await supabase.from("itam_asset_history").insert(historyEntries);
        if (historyError) throw historyError;
      }

      if (notes.trim()) {
        updateUISettings.mutate({ checkinPreferences: { lastNotes: notes.trim() } });
      }

      return selectedItems.length;
    },
    onSuccess: async (count) => {
      setShowSuccess(true);
      toast.success(`${count} asset(s) checked in successfully`);
      invalidateAllAssetQueries(queryClient);

      // Send consolidated emails grouped by previous assignee
      try {
        const selectedItems = selectedRows
          .map((id) => selectedCache.get(id))
          .filter(Boolean) as CheckinRow[];

        // Group by assignedTo user
        const userAssetMap = new Map<string, string[]>();
        for (const item of selectedItems) {
          if (item.assignedTo) {
            const existing = userAssetMap.get(item.assignedTo) || [];
            existing.push(item.assetUuid);
            userAssetMap.set(item.assignedTo, existing);
          }
        }

        for (const [userId, assetIds] of userAssetMap) {
          const user = users.find(u => u.id === userId);
          if (!user?.email) continue;

          const userName = getUserDisplayName(user) || user.email;

          // Fetch full asset details
          const { data: fullAssets } = await supabase
            .from("itam_assets")
            .select("asset_tag, name, serial_number, model, custom_fields, itam_categories(name), make:itam_makes!make_id(name)")
            .in("id", assetIds);

          const assetRows = (fullAssets || []).map((a: any) => ({
            asset_tag: a.asset_tag || "N/A",
            description: a.itam_categories?.name || a.name || "N/A",
            brand: a.make?.name || "N/A",
            model: a.model || "N/A",
            serial_number: a.serial_number || null,
            photo_url: (a.custom_fields as any)?.photo_url || null,
          }));

          await supabase.functions.invoke("send-asset-email", {
            body: {
              templateId: "checkin",
              recipientEmail: user.email,
              assets: assetRows,
              variables: {
                user_name: userName,
                checkin_date: format(checkInDate, "dd/MM/yyyy HH:mm"),
                notes: notes || "—",
              },
            },
          });
        }

        if (userAssetMap.size > 0) {
          toast.success("Email notification(s) sent");
        }
      } catch (emailErr) {
        console.warn("Email notification failed:", emailErr);
        toast.warning("Email notification could not be sent");
      }

      setTimeout(() => navigate(FALLBACK_NAV), 500);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to check in assets");
    },
  });

  const handleCheckin = () => setConfirmOpen(true);
  const confirmCheckin = () => {
    setConfirmOpen(false);
    checkinMutation.mutate();
  };

  const canCheckin = selectedRows.length > 0 && !checkinMutation.isPending && !showSuccess;
  const isStaleSearch = search !== deferredSearch;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmOpen) {
        navigate(FALLBACK_NAV);
        return;
      }
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (e.key === "Enter" && !e.shiftKey && !confirmOpen && canCheckin && activeTag !== "textarea" && activeTag !== "input") {
        e.preventDefault();
        handleCheckin();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canCheckin, confirmOpen, navigate]);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="flex gap-3 h-full">
          {/* Asset list */}
          <Card className="flex-1 min-w-0 flex flex-col min-h-0 shadow-none border">
            <CardHeader className="pb-2 px-3 pt-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search tag, name, user..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-7 h-8 text-xs"
                      aria-label="Search check-in records"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs h-5 gap-1 flex-shrink-0">
                    {isLoading ? "…" : sortedRows.length} records
                  </Badge>
                </div>
                {selectedRows.length > 0 && (
                  <Badge variant="default" className="text-xs h-5 gap-1 flex-shrink-0">
                    {selectedRows.length} selected
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex flex-col flex-1 min-h-0 p-0">
              {isError && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-destructive/30 bg-destructive/5">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-xs text-destructive">Failed to load records.</p>
                  <Button variant="outline" size="sm" className="ml-auto h-6 text-xs px-2" onClick={() => refetch()}>Retry</Button>
                </div>
              )}

              <ScrollArea className="flex-1 min-h-0">
                <Table className="table-fixed" wrapperClassName="border-0 rounded-none">
                  <colgroup>
                    <col className="w-[36px]" />
                    <col className="w-[44px]" />
                    <col className="w-[40px]" />
                    <col className="w-[120px]" />
                    <col />
                    <col className="w-[130px]" />
                    <col className="w-[100px]" />
                  </colgroup>
                  <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="px-2 h-8">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={toggleSelectAll}
                          disabled={sortedRows.length === 0}
                          aria-label="Select all"
                          className="h-3.5 w-3.5"
                        />
                      </TableHead>
                      <TableHead className="text-xs px-1 h-8">#</TableHead>
                      <TableHead className="px-1 h-8"></TableHead>
                      <SortableTableHeader column="asset_tag" label="Asset Tag" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" />
                      <SortableTableHeader column="name" label="Asset" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" />
                      <SortableTableHeader column="assignedTo" label="Assigned To" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" />
                      <SortableTableHeader column="assignedAt" label="Date" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" />
                    </TableRow>
                  </TableHeader>

                  <TableBody className={cn("transition-opacity duration-200", isStaleSearch && "opacity-50")}>
                    {isLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={`sk-${i}`}>
                          <TableCell className="px-2"><Skeleton className="h-3.5 w-3.5 rounded" /></TableCell>
                          <TableCell className="px-1"><Skeleton className="h-3 w-4" /></TableCell>
                          <TableCell className="px-1"><Skeleton className="h-7 w-7 rounded" /></TableCell>
                          <TableCell className="px-2"><Skeleton className="h-3 w-16" /></TableCell>
                          <TableCell className="px-2"><Skeleton className="h-3 w-20" /></TableCell>
                          <TableCell className="px-2"><Skeleton className="h-3 w-20" /></TableCell>
                          <TableCell className="px-2"><Skeleton className="h-3 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : sortedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                            {search ? (
                              <>
                                <SearchX className="h-6 w-6 opacity-40" />
                                <p className="text-xs">No assets match "{search}"</p>
                                <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline mt-1">Clear search</button>
                              </>
                            ) : (
                              <>
                                <PackageOpen className="h-6 w-6 opacity-40" />
                                <p className="text-xs">No checked-out assets</p>
                                <p className="text-xs opacity-60">All assets are currently available</p>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedRows.map((row, index) => (
                        <TableRow
                          key={row.rowId}
                          className={cn(
                            "cursor-pointer transition-colors duration-100 h-9",
                            selectedRows.includes(row.rowId)
                              ? "bg-primary/8 hover:bg-primary/12"
                              : "hover:bg-muted/40"
                          )}
                          onClick={() => toggleRow(row)}
                        >
                          <TableCell className="px-2 py-1">
                            <Checkbox
                              checked={selectedRows.includes(row.rowId)}
                              onCheckedChange={() => toggleRow(row)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5"
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums px-1 py-1 whitespace-nowrap">{index + 1}</TableCell>
                          <TableCell className="px-1 py-1">
                            <AssetThumbnail
                              url={row.photoUrl}
                              name={row.assetName}
                              onClick={() => row.photoUrl && setPreviewImage({ url: row.photoUrl, name: row.assetName })}
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-2 py-1 truncate">{row.assetTag || row.assetCode}</TableCell>
                          <TableCell className="text-xs font-medium px-2 py-1 truncate">{row.assetName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground px-2 py-1 truncate">{getUserName(row.assignedTo)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground px-2 py-1 truncate">
                            {row.assignedAt ? format(new Date(row.assignedAt), "MMM dd, yyyy") : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Check-in panel */}
          <Card className="w-[340px] flex-shrink-0 flex flex-col lg:sticky lg:top-3 lg:self-start shadow-sm border">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                Check In
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Return selected assets to inventory</p>
            </CardHeader>

            <CardContent className="space-y-4 px-3 pb-3">
              {selectedRows.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {selectedRows.map((id) => {
                    const item = selectedCache.get(id);
                    if (!item) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-0.5 text-xs h-5 px-1.5">
                        {item.assetTag || item.assetName}
                        <X className="h-2.5 w-2.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => toggleRow(id)} />
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Select assets from the list</p>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {format(checkInDate, "MMM dd, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkInDate}
                      onSelect={(date) => date && setCheckInDate(date)}
                      initialFocus
                      className="p-2 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  placeholder="Return condition notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="text-xs resize-none min-h-[60px]"
                />
              </div>

              <div className="pt-2 space-y-1.5 border-t">
                <Button className="w-full h-8 text-xs" onClick={handleCheckin} disabled={!canCheckin}>
                  {showSuccess ? (
                    <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Done!</>
                  ) : checkinMutation.isPending ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Check In{selectedRows.length > 0 ? ` (${selectedRows.length})` : ""}</>
                  )}
                </Button>
                <Button variant="outline" className="w-full h-8 text-xs" onClick={() => navigate(FALLBACK_NAV)} disabled={checkinMutation.isPending || showSuccess}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-lg p-2">
          {previewImage && (
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="w-full h-auto max-h-[70vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check In</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Check in <strong>{selectedRows.length}</strong> asset{selectedRows.length !== 1 ? "s" : ""} back to inventory.</p>
                <p className="text-muted-foreground">Date: <strong>{format(checkInDate, "MMM dd, yyyy")}</strong></p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {selectedRows.map((id) => {
                    const item = selectedCache.get(id);
                    if (!item) return null;
                    return <Badge key={id} variant="secondary" className="text-xs h-5">{item.assetTag || item.assetName}</Badge>;
                  })}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCheckin} disabled={checkinMutation.isPending} className="h-8 text-xs">
              {checkinMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Processing...</> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CheckinPage;
