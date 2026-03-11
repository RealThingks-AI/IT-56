import { useState, useDeferredValue, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ImagePreviewDialog } from "@/components/helpdesk/assets/ImagePreviewDialog";
import { EmptyState } from "@/components/helpdesk/assets/EmptyState";
import { AssetSearchBar } from "@/components/helpdesk/assets/AssetSearchBar";
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
  ArrowDownToLine,
  X,
  Loader2,
  CheckCircle2,
  CalendarIcon,
  AlertCircle,
  History,
} from "lucide-react";
import { cn, sanitizeSearchInput } from "@/lib/utils";
import { PaginationControls } from "@/components/helpdesk/assets/PaginationControls";
import { useUsers } from "@/hooks/useUsers";
import { useAssetSelection } from "@/hooks/assets/useAssetSelection";
import { useSortableAssets } from "@/hooks/assets/useSortableAssets";

import { getUserDisplayName } from "@/lib/userUtils";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";
import { ASSET_STATUS } from "@/lib/assets/assetStatusUtils";
import { SortableTableHeader } from "@/components/helpdesk/SortableTableHeader";
import { useUsersLookup } from "@/hooks/useUsersLookup";
import { formatRelativeTime } from "@/lib/dateUtils";

interface CheckinRow {
  id: string; // alias for rowId, required by useAssetSelection
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
  locationLabel?: string | null;
  categoryName?: string | null;
}

import { FALLBACK_NAV, getPhotoUrl, useAssetPageShortcuts } from "@/lib/assets/assetHelpers";
import { AssetThumbnail } from "@/components/helpdesk/assets/AssetThumbnail";

const CheckinPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const deferredSearch = useDeferredValue(search);
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 200;

  const { data: users = [] } = useUsers();
  const { resolveUserName } = useUsersLookup();

  // Recent checkins query
  const { data: recentCheckins = [] } = useQuery({
    queryKey: ["recent-checkins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_asset_history")
        .select("id, created_at, action, new_value, old_value, asset_tag, performed_by, details")
        .eq("action", "checked_in")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    staleTime: 30_000,
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["itam-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_categories").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  const getUserName = useCallback((userId: string | null) => {
    if (!userId) return "—";
    return resolveUserName(userId) || "Unknown User";
  }, [resolveUserName]);

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["itam-checkin-rows", deferredSearch],
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<CheckinRow[]> => {
      const [activeAssignmentsRes, inUseAssetsRes] = await Promise.all([
        supabase
          .from("itam_asset_assignments")
          .select("id, asset_id, assigned_to, assigned_at, asset:itam_assets(id, name, asset_tag, asset_id, custom_fields, category:itam_categories(name))")
          .is("returned_at", null)
          .order("assigned_at", { ascending: false })
          .limit(5000),
        supabase
          .from("itam_assets")
          .select("id, name, asset_tag, asset_id, custom_fields, assigned_to, checked_out_to, checked_out_at, updated_at, location_id, category:itam_categories(name), location:itam_locations(id, name, site:itam_sites(id, name))")
          .eq("is_active", true)
          .eq("status", "in_use")
          .order("checked_out_at", { ascending: false })
          .limit(5000),
      ]);

      if (activeAssignmentsRes.error) throw activeAssignmentsRes.error;
      if (inUseAssetsRes.error) throw inUseAssetsRes.error;

      const assignmentRows: CheckinRow[] = (activeAssignmentsRes.data || []).map((a: any) => ({
        id: a.id,
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
        categoryName: a.asset?.category?.name || null,
      }));

      const assetsAlreadyInAssignments = new Set(assignmentRows.map((a) => a.assetUuid));

      const inferredRows: CheckinRow[] = (inUseAssetsRes.data || [])
        .filter((asset: any) => !assetsAlreadyInAssignments.has(asset.id))
        .map((asset: any) => {
          let displayAssignedTo = asset.checked_out_to || asset.assigned_to;
          let displayLabel: string | null = null;
          if (!displayAssignedTo && asset.location) {
            const loc = asset.location as any;
            displayLabel = loc.site?.name ? `${loc.name} (${loc.site.name})` : loc.name;
          }
          return {
            id: `asset-${asset.id}`,
            rowId: `asset-${asset.id}`,
            assignmentId: null,
            assetUuid: asset.id,
            assetName: asset.name || "Unnamed asset",
            assetTag: asset.asset_tag || null,
            assetCode: asset.asset_id || "",
            photoUrl: getPhotoUrl(asset),
            assignedTo: displayAssignedTo,
            assignedAt: asset.checked_out_at || asset.updated_at,
            source: "asset" as const,
            locationLabel: displayLabel,
            categoryName: asset.category?.name || null,
          };
        });

      let mergedRows = [...assignmentRows, ...inferredRows];

      if (deferredSearch) {
        const term = sanitizeSearchInput(deferredSearch).toLowerCase();
        mergedRows = mergedRows.filter((r) => {
          const userName = getUserName(r.assignedTo).toLowerCase();
          const locLabel = (r.locationLabel || "").toLowerCase();
          return (
            r.assetName.toLowerCase().includes(term) ||
            (r.assetTag || "").toLowerCase().includes(term) ||
            r.assetCode.toLowerCase().includes(term) ||
            userName.includes(term) ||
            locLabel.includes(term)
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

  // Shared selection hook
  const {
    selectedIds: selectedRows,
    selectedCache,
    toggleItem: toggleRow,
    toggleAll,
    clearSelection,
    isSelected,
    selectedCount,
  } = useAssetSelection<CheckinRow>((item) => item.rowId);

  // Shared sort hook
  const getColumnValue = useCallback((item: CheckinRow, column: string): string | number => {
    switch (column) {
      case "asset_tag": return item.assetTag || item.assetCode || "";
      case "name": return item.assetName || "";
      case "assignedTo": return getUserName(item.assignedTo);
      case "assignedAt": return item.assignedAt ? new Date(item.assignedAt).getTime() : 0;
      default: return "";
    }
  }, [getUserName]);

  // Apply category filter
  const filteredRows = useMemo(() => {
    if (categoryFilter === "all") return rows;
    return rows.filter((r) => r.categoryName === categoryFilter);
  }, [rows, categoryFilter]);

  const { sortedData: sortedRows, sortConfig, handleSort } = useSortableAssets(
    filteredRows,
    getColumnValue,
    { initialColumn: "assignedAt", initialDirection: "desc" }
  );

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [deferredSearch]);

  const totalPages = Math.ceil(sortedRows.length / ITEMS_PER_PAGE);
  const paginatedRows = sortedRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const allSelected = sortedRows.length > 0 && sortedRows.every((r) => isSelected(r.rowId));
  const someSelected = sortedRows.some((r) => isSelected(r.rowId));

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

      // Create pre-closed assignment records for orphan assets
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
          new_value: "In Stock",
          asset_tag: asset.asset_tag,
          details: { notes, returned_at: now, returned_from: prevUserName, user_id: item?.assignedTo || null },
          performed_by: currentUser?.id,
        };
      });

      if (historyEntries.length > 0) {
        const { error: historyError } = await supabase.from("itam_asset_history").insert(historyEntries);
        if (historyError) throw historyError;
      }

      return selectedItems.length;
    },
    onSuccess: async (count) => {
      setShowSuccess(true);
      toast.success(`${count} asset(s) checked in successfully`);
      invalidateAllAssetQueries(queryClient);

      // Send consolidated emails grouped by previous assignee (only if opted in)
      if (sendEmail) {
        try {
          const selectedItems = selectedRows
            .map((id) => selectedCache.get(id))
            .filter(Boolean) as CheckinRow[];

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

  const canCheckin = selectedCount > 0 && !checkinMutation.isPending && !showSuccess;
  const isStaleSearch = search !== deferredSearch;

  useAssetPageShortcuts({
    canConfirm: canCheckin,
    dialogOpen: confirmOpen,
    onConfirm: handleCheckin,
  });

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="flex gap-3 h-full">
          {/* Asset list */}
          <Card className="flex-1 min-w-0 flex flex-col min-h-0 shadow-sm border">
            <CardHeader className="pb-1.5 px-3 pt-2.5 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AssetSearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search tag, name, user..."
                    ariaLabel="Search check-in records"
                    className="w-[200px]"
                  />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-7 w-[140px] text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.name} className="text-xs">{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-xs h-5 gap-1 flex-shrink-0">
                    {isLoading ? "…" : sortedRows.length} records
                  </Badge>
                </div>
                {selectedCount > 0 && (
                  <Badge variant="outline" className="text-xs h-5 gap-1 flex-shrink-0">
                    {selectedCount} selected
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
                <Table className="table-fixed" wrapperClassName="border-0 rounded-none overflow-visible">
                  <colgroup>
                    <col className="w-[36px]" />
                    <col className="w-[44px]" />
                    <col className="w-[40px]" />
                    <col className="w-[120px]" />
                    <col />
                    <col className="w-[200px]" />
                    <col className="w-[100px]" />
                  </colgroup>
                  <TableHeader className="sticky top-0 bg-muted shadow-sm z-10">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="px-2 h-8">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={() => toggleAll(sortedRows, allSelected)}
                          disabled={sortedRows.length === 0}
                          aria-label="Select all"
                          className="h-3.5 w-3.5"
                        />
                      </TableHead>
                      <TableHead className="text-xs px-1 h-8">#</TableHead>
                      <TableHead className="px-1 h-8"></TableHead>
                      <SortableTableHeader column="asset_tag" label="Asset Tag" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" style={{ width: 120 }} />
                      <SortableTableHeader column="name" label="Asset" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" />
                      <SortableTableHeader column="assignedTo" label="Assigned To" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" style={{ minWidth: 200 }} />
                      <SortableTableHeader column="assignedAt" label="Date" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" style={{ width: 100 }} />
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
                      <TableCell colSpan={7} className="text-center p-0">
                          <EmptyState
                            title="No checked-out assets"
                            subtitle="All assets are currently in stock"
                            search={search}
                            onClearSearch={() => setSearch("")}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row, index) => (
                        <TableRow
                          key={row.rowId}
                          className={cn(
                            "cursor-pointer transition-colors duration-100 h-9",
                            isSelected(row.rowId)
                              ? "bg-primary/10 hover:bg-primary/15"
                              : "hover:bg-muted/40"
                          )}
                          onClick={() => toggleRow(row)}
                        >
                          <TableCell className="px-2 py-1">
                            <Checkbox
                              checked={isSelected(row.rowId)}
                              onCheckedChange={() => toggleRow(row)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5"
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums px-1 py-1 whitespace-nowrap">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                          <TableCell className="px-1 py-1">
                            <AssetThumbnail
                              url={row.photoUrl}
                              name={row.assetName}
                              onClick={() => row.photoUrl && setPreviewImage({ url: row.photoUrl, name: row.assetName })}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground px-2 py-1 truncate">
                            {(row.assetTag || row.assetCode) ? (
                              <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/detail/${row.assetUuid}`); }}>{row.assetTag || row.assetCode}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm px-2 py-1 truncate">{row.assetName}</TableCell>
                          <TableCell className="text-xs px-2 py-1">
                            {row.assignedTo ? (
                              <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/employees?user=${row.assignedTo}`); }}>{getUserName(row.assignedTo)}</span>
                            ) : row.locationLabel ? (
                              <span className="text-muted-foreground italic text-xs">📍 {row.locationLabel}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-2 py-1 truncate">
                            {row.assignedAt ? format(new Date(row.assignedAt), "MMM dd, yyyy") : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sortedRows.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="w-[320px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto max-h-full">
            {/* Check-in Form */}
            <Card className="flex-shrink-0 shadow-sm border">
              <CardHeader className="pb-1.5 px-3 pt-2.5">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Check In
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 px-3 pb-3">
                {selectedCount > 0 ? (
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
                    rows={2}
                    className="text-xs resize-none min-h-[48px]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="checkin-send-email"
                      checked={sendEmail}
                      onCheckedChange={(checked) => setSendEmail(!!checked)}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor="checkin-send-email" className="text-xs font-normal cursor-pointer">
                      Send email notification to user
                    </Label>
                  </div>
                  {sendEmail && selectedRows.length > 0 && (() => {
                    const emails = new Set<string>();
                    for (const id of selectedRows) {
                      const item = selectedCache.get(id);
                      if (item?.assignedTo) {
                        const u = users.find(u => u.id === item.assignedTo);
                        if (u?.email) emails.add(u.email);
                      }
                    }
                    return emails.size > 0 ? (
                      <p className="text-[11px] text-muted-foreground pl-5">
                        To: {[...emails].join(", ")}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div className="pt-2 flex gap-2 border-t">
                  <Button className="flex-1 h-8 text-xs" onClick={handleCheckin} disabled={!canCheckin}>
                    {showSuccess ? (
                      <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Done!</>
                    ) : checkinMutation.isPending ? (
                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Processing...</>
                    ) : (
                      <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Check In{selectedCount > 0 ? ` (${selectedCount})` : ""}</>
                    )}
                  </Button>
                  <Button variant="outline" className="h-8 text-xs px-4" onClick={() => navigate(FALLBACK_NAV)} disabled={checkinMutation.isPending || showSuccess}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Check Ins */}
            <Card className="flex-1 min-h-0 shadow-sm border flex flex-col">
              <CardHeader className="pb-1.5 px-3 pt-2.5 flex-shrink-0">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <History className="h-3 w-3" />
                  Recent Check Ins
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 flex-1 min-h-0 overflow-y-auto">
                {recentCheckins.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No recent check ins</p>
                ) : (
                  <div>
                    <Table wrapperClassName="border-0 rounded-none">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                         <TableHead className="text-[11px] px-1.5 h-6">When</TableHead>
                          <TableHead className="text-[11px] px-1.5 h-6">Asset Tag</TableHead>
                          <TableHead className="text-[11px] px-1.5 h-6">User</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentCheckins.map((tx: any) => (
                          <TableRow key={tx.id} className="h-7">
                            <TableCell className="text-[11px] text-muted-foreground px-1.5 py-0.5 whitespace-nowrap">
                              {formatRelativeTime(tx.created_at)}
                            </TableCell>
                            <TableCell className="text-[11px] px-1.5 py-0.5">
                              {tx.asset_tag ? (
                                <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/allassets?search=${encodeURIComponent(tx.asset_tag)}`); }}>{tx.asset_tag}</span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-[11px] text-muted-foreground px-1.5 py-0.5 truncate max-w-[120px]">
                              {(() => {
                                const details = tx.details as any;
                                const userId = details?.user_id && /^[0-9a-f]{8}-/i.test(details.user_id) ? details.user_id : null;
                                const userName = tx.old_value || resolveUserName(tx.performed_by) || "—";
                                return userName !== "—" && userId ? (
                                  <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/employees?user=${userId}`); }}>{userName}</span>
                                ) : userName;
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ImagePreviewDialog image={previewImage} onClose={() => setPreviewImage(null)} />

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check In</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Check in <strong>{selectedCount}</strong> asset{selectedCount !== 1 ? "s" : ""} back to inventory.</p>
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
