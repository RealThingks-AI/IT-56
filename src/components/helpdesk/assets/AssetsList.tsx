import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sanitizeSearchInput } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { SYSTEM_COLUMN_ORDER } from "./AssetColumnSettings";
import { AssetPhotoPreview } from "./AssetPhotoPreview";
import { AssetActionsMenu } from "./AssetActionsMenu";
import { useUISettings } from "@/hooks/useUISettings";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

interface AssetsListProps {
  filters?: Record<string, any>;
  onSelectionChange?: (selectedIds: string[], actions: any) => void;
  onDataLoad?: (data: any[]) => void;
  showSelection?: boolean;
}

type SortDirection = "asc" | "desc" | null;
type SortColumn = string | null;

const PAGE_SIZE_OPTIONS = [100, 250, 500, 1000];

// Column minimum widths for proper spacing
const COLUMN_MIN_WIDTHS: Record<string, string> = {
  asset_tag: "min-w-[100px]",
  category: "min-w-[90px]",
  status: "min-w-[85px]",
  make: "min-w-[80px]",
  model: "min-w-[80px]",
  serial_number: "min-w-[110px]",
  assigned_to: "min-w-[100px]",
  asset_configuration: "min-w-[130px]",
  description: "min-w-[150px]",
  cost: "min-w-[80px]",
  purchase_date: "min-w-[100px]",
  purchased_from: "min-w-[100px]",
  location: "min-w-[80px]",
  site: "min-w-[80px]",
  department: "min-w-[90px]",
  asset_classification: "min-w-[110px]",
  asset_photo: "min-w-[60px]",
  event_date: "min-w-[100px]",
  event_due_date: "min-w-[100px]",
  event_notes: "min-w-[140px]",
  created_by: "min-w-[100px]",
  created_at: "min-w-[100px]"
};

// Plain status labels (no pill styling)
const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  in_use: "In Use",
  maintenance: "Maintenance",
  retired: "Retired",
  disposed: "Disposed",
  lost: "Lost",
};

export function AssetsList({
  filters = {},
  onSelectionChange,
  onDataLoad,
  showSelection = false
}: AssetsListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const prefsLoadedRef = useRef(false);

  // Load column settings from database via hook
  const { assetColumns: savedColumns, uiSettings, updateUISettings } = useUISettings();

  // Column widths state - loaded from DB, saved on resize
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizeRef = useRef<{ col: string; startX: number; startW: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved column widths and list preferences from UI settings
  useEffect(() => {
    if (prefsLoadedRef.current) return;
    const saved = (uiSettings as any)?.assetColumnWidths;
    if (saved && typeof saved === 'object') {
      setColumnWidths(saved);
    }
    const listPrefs = (uiSettings as any)?.assetListPreferences;
    if (listPrefs) {
      if (listPrefs.pageSize) setPageSize(listPrefs.pageSize);
      if (listPrefs.sortColumn) setSortColumn(listPrefs.sortColumn);
      if (listPrefs.sortDirection) setSortDirection(listPrefs.sortDirection);
      prefsLoadedRef.current = true;
    } else if (Object.keys(uiSettings || {}).length > 0) {
      prefsLoadedRef.current = true;
    }
  }, [uiSettings]);

  // Debounced save of column widths
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateUISettings.mutate({ assetColumnWidths: widths } as any);
    }, 500);
  }, [updateUISettings]);

  // Mouse handlers for column resize
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { col: columnId, startX: e.clientX, startW: currentWidth };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = ev.clientX - resizeRef.current.startX;
      const newWidth = Math.max(60, resizeRef.current.startW + diff);
      setColumnWidths(prev => {
        const updated = { ...prev, [resizeRef.current!.col]: newWidth };
        return updated;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Save after resize ends
      setColumnWidths(prev => {
        saveColumnWidths(prev);
        return prev;
      });
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [saveColumnWidths]);

  // Merge saved visibility with system column order
  const visibleColumns = useMemo(() => {
    if (savedColumns && savedColumns.length > 0) {
      return SYSTEM_COLUMN_ORDER.map((systemCol) => {
        const savedCol = savedColumns.find((c) => c.id === systemCol.id);
        return savedCol ? { ...systemCol, visible: savedCol.visible } : systemCol;
      }).sort((a, b) => a.order_index - b.order_index);
    }
    return [...SYSTEM_COLUMN_ORDER].sort((a, b) => a.order_index - b.order_index);
  }, [savedColumns]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.type]);

  // Fetch total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["helpdesk-assets-count", filters],
    queryFn: async () => {
      let query = supabase.
      from("itam_assets").
      select("id", { count: "exact", head: true }).
      eq("is_active", true);

      if (filters.search) {
        const s = sanitizeSearchInput(filters.search);
        query = query.or(
          `name.ilike.%${s}%,asset_tag.ilike.%${s}%,serial_number.ilike.%${s}%,model.ilike.%${s}%,description.ilike.%${s}%`
        );
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.type) {
        query = query.eq("category_id", filters.type);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch paginated assets with related data
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["helpdesk-assets", filters, page, pageSize, sortColumn, sortDirection],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.
      from("itam_assets").
      select(`
          *,
          category:itam_categories(id, name),
          location:itam_locations(id, name, site:itam_sites(id, name)),
          department:itam_departments(id, name),
          make:itam_makes(id, name),
          vendor:itam_vendors(id, name)
        `).
      eq("is_active", true).
      range(from, to);

      if (filters.search) {
        const s = sanitizeSearchInput(filters.search);
        query = query.or(
          `name.ilike.%${s}%,asset_tag.ilike.%${s}%,serial_number.ilike.%${s}%,model.ilike.%${s}%,description.ilike.%${s}%`
        );
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.type) {
        query = query.eq("category_id", filters.type);
      }

      // Apply sorting
      if (sortColumn && sortDirection) {
        const ascending = sortDirection === "asc";
        switch (sortColumn) {
          case "asset_tag":
          case "model":
          case "status":
          case "serial_number":
          case "description":
          case "created_at":
          case "purchase_date":
          case "assigned_to":
            query = query.order(sortColumn, { ascending });
            break;
          case "cost":
            query = query.order("purchase_price", { ascending });
            break;
          case "event_date":
            query = query.order("checked_out_at", { ascending });
            break;
          case "event_due_date":
            query = query.order("expected_return_date", { ascending });
            break;
          case "category":
            query = query.order("category_id", { ascending });
            break;
          case "location":
            query = query.order("location_id", { ascending });
            break;
          case "department":
            query = query.order("department_id", { ascending });
            break;
          case "make":
            query = query.order("make_id", { ascending });
            break;
          default:
            query = query.order("created_at", { ascending: false });
        }
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch users for assigned_to lookup
  const { data: usersData = [] } = useQuery({
    queryKey: ["users-for-assets-list"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Helper to get user name by ID or return original value if not a UUID
  const getUserName = (assignedTo: string | null) => {
    if (!assignedTo) return null;
    // Check if it looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(assignedTo)) {
      const user = usersData.find((u) => u.id === assignedTo);
      return user?.name || user?.email || null;
    }
    // Return as-is if it's already a name
    return assignedTo;
  };

  // Notify parent when data changes (for export) — use ref to avoid re-render loops
  const onDataLoadRef = useRef(onDataLoad);
  onDataLoadRef.current = onDataLoad;
  useEffect(() => {
    if (onDataLoadRef.current && assets.length > 0) {
      onDataLoadRef.current(assets);
    }
  }, [assets]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateStatus = useMutation({
    mutationFn: async ({ ids, status }: {ids: string[];status: string;}) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // For check-in: close open assignments and clear assignment fields
      if (status === ASSET_STATUS.AVAILABLE) {
        const now = new Date().toISOString();
        // Close open assignments
        for (const id of ids) {
          await supabase
            .from("itam_asset_assignments")
            .update({ returned_at: now })
            .eq("asset_id", id)
            .is("returned_at", null);
        }
        // Clear assignment fields
        const { error } = await supabase
          .from("itam_assets")
          .update({ 
            status,
            assigned_to: null,
            checked_out_to: null,
            checked_out_at: null,
            expected_return_date: null,
            check_out_notes: null,
          })
          .in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("itam_assets")
          .update({ status })
          .in("id", ids);
        if (error) throw error;
      }

      // Log history for each asset
      const historyEntries = ids.map(id => ({
        asset_id: id,
        action: `bulk_status_change`,
        new_value: status,
        details: { bulk_action: true, new_status: status },
        performed_by: currentUser?.id,
      }));
      await supabase.from("itam_asset_history").insert(historyEntries);
    },
    onSuccess: () => {
      invalidateAllAssetQueries(queryClient);
      toast.success("Assets updated");
      setSelectedIds([]);
    }
  });

  const deleteAssets = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_active: false })
        .in("id", ids);
      if (error) throw error;

      // Log history for each deleted asset
      const historyEntries = ids.map(id => ({
        asset_id: id,
        action: "deleted",
        details: { bulk_action: true },
        performed_by: currentUser?.id,
      }));
      await supabase.from("itam_asset_history").insert(historyEntries);
    },
    onSuccess: () => {
      invalidateAllAssetQueries(queryClient);
      toast.success("Assets deleted");
      setSelectedIds([]);
    }
  });

  const createBulkActions = (ids: string[]) => ({
    handleCheckOut: () => updateStatus.mutate({ ids, status: ASSET_STATUS.IN_USE }),
    handleCheckIn: () => updateStatus.mutate({ ids, status: ASSET_STATUS.AVAILABLE }),
    handleMaintenance: () => updateStatus.mutate({ ids, status: ASSET_STATUS.MAINTENANCE }),
    handleDispose: () => updateStatus.mutate({ ids, status: ASSET_STATUS.DISPOSED }),
    handleDelete: () => deleteAssets.mutate(ids)
  });

  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? assets.map((a: any) => a.id) : [];
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected, createBulkActions(newSelected));
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = checked ?
    [...selectedIds, id] :
    selectedIds.filter((sid) => sid !== id);
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected, createBulkActions(newSelected));
  };

  // Save list preferences to DB
  const saveListPreferences = useCallback((ps: number, sc: SortColumn, sd: SortDirection) => {
    updateUISettings.mutate({ assetListPreferences: { pageSize: ps, sortColumn: sc, sortDirection: sd } } as any);
  }, [updateUISettings]);

  const handleSort = (column: string) => {
    let newCol: SortColumn = column;
    let newDir: SortDirection = "asc";
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        newDir = "desc";
      } else {
        newCol = null;
        newDir = null;
      }
    }
    setSortColumn(newCol);
    setSortDirection(newDir);
    saveListPreferences(pageSize, newCol, newDir);
  };

  const formatCurrency = (amount: number | null, asset?: any) => {
    if (amount === null || amount === undefined) return "—";
    const currency = asset?.custom_fields?.currency || "INR";
    const currencySymbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£"
    };
    const symbol = currencySymbols[currency] || "₹";
    const locale = currency === "INR" ? "en-IN" : "en-US";
    return `${symbol}${amount.toLocaleString(locale)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return "—";
    }
  };

  // Get sort indicator for column header
  const getSortIndicator = (columnId: string) => {
    if (sortColumn !== columnId) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  // Get visible columns - sorted by order_index (fixed positions)
  const activeColumns = visibleColumns.
  filter((c) => c.visible).
  sort((a, b) => a.order_index - b.order_index);

  // Render cell based on column ID - no bold text, plain status
  const renderCell = (asset: any, columnId: string) => {
    const customFields = asset.custom_fields || {};

    switch (columnId) {
      case "asset_photo":
        const photoUrl = customFields.photo_url;
        return (
          <AssetPhotoPreview
            photoUrl={photoUrl}
            assetName={asset.name || asset.asset_tag} />);



      case "asset_tag": {
        // Hide raw UUIDs — only show human-readable asset tags
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asset.asset_tag || "");
        const searchTerm = filters?.search?.toLowerCase();
        const tagVal = asset.asset_tag?.toLowerCase() || "";
        const tagMatches = searchTerm && tagVal.includes(searchTerm);
        const serialMatches = searchTerm && !tagMatches && asset.serial_number?.toLowerCase()?.includes(searchTerm);
        const nameMatches = searchTerm && !tagMatches && !serialMatches && asset.name?.toLowerCase()?.includes(searchTerm);
        const modelMatches = searchTerm && !tagMatches && !serialMatches && !nameMatches && asset.model?.toLowerCase()?.includes(searchTerm);
        const descMatches = searchTerm && !tagMatches && !serialMatches && !nameMatches && !modelMatches && asset.description?.toLowerCase()?.includes(searchTerm);
        return (
          <>
            <span className="text-primary hover:underline cursor-pointer">
              {(!asset.asset_tag || isUuid) ? "—" : asset.asset_tag}
            </span>
            {serialMatches && (
              <div className="text-[10px] text-muted-foreground/70 truncate max-w-[160px]">S/N: {asset.serial_number}</div>
            )}
            {nameMatches && (
              <div className="text-[10px] text-muted-foreground/70 truncate max-w-[160px]">Name: {asset.name}</div>
            )}
            {modelMatches && (
              <div className="text-[10px] text-muted-foreground/70 truncate max-w-[160px]">Model: {asset.model}</div>
            )}
            {descMatches && (
              <div className="text-[10px] text-muted-foreground/70 truncate max-w-[160px]">Desc: {asset.description}</div>
            )}
          </>
        );
      }


      case "make":
        return asset.make?.name || "—";

      case "cost":
        return formatCurrency(asset.purchase_price, asset);

      case "created_by":
        return getUserName(asset.created_by) || "—";

      case "created_at":
        return formatDate(asset.created_at);

      case "description":
        return asset.description || "—";

      case "model":
        return asset.model || "—";

      case "purchase_date":
        return formatDate(asset.purchase_date);

      case "purchased_from":
        return asset.vendor?.name || "—";

      case "serial_number":
        return asset.serial_number || "—";

      case "asset_classification": {
        const clf = customFields.classification;
        if (Array.isArray(clf) && clf.length > 0) {
          return clf.map((c: string) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ");
        }
        return typeof clf === "string" && clf ? clf : "—";
      }

      case "asset_configuration":
        return customFields.asset_configuration || "—";

      case "category":
        return asset.category?.name || "—";

      case "department":
        return asset.department?.name || "—";

      case "location":
        return asset.location?.name || "—";

      case "site":
        return asset.location?.site?.name || "—";

      case "assigned_to":
        // Look up user name if it's a UUID, otherwise display as-is
        return getUserName(asset.assigned_to) || "—";

      case "event_date":
        return formatDate(asset.checked_out_at);

      case "event_due_date":
        return formatDate(asset.expected_return_date);

      case "event_notes":
        return asset.check_out_notes || "—";

      case "status":
        const statusDotColor: Record<string, string> = {
          available: "bg-green-500",
          in_use: "bg-blue-500",
          maintenance: "bg-amber-500",
          retired: "bg-gray-400",
          disposed: "bg-red-500",
          lost: "bg-orange-500",
        };
        const dotColor = statusDotColor[asset.status] || "bg-gray-400";
        return (
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
            {STATUS_LABELS[asset.status] || asset.status?.replace("_", " ") || "—"}
          </span>
        );

      default:
        return "—";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto rounded-md border">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow className="border-b-2 border-border">
                <TableHead className="w-12 py-1"><Skeleton className="h-4 w-6" /></TableHead>
                {activeColumns.filter(c => c.visible).slice(0, 8).map((col) => (
                  <TableHead key={col.id} className="py-1">
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border">
                  <TableCell className="py-1"><Skeleton className="h-4 w-6" /></TableCell>
                  {activeColumns.filter(c => c.visible).slice(0, 8).map((col) => (
                    <TableCell key={col.id} className="py-1">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
        <div className="shrink-0 border-t px-6 py-2 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-x-auto overflow-y-auto rounded-md border">
        <table className="w-full caption-bottom text-sm" style={{ tableLayout: "auto" }}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="border-b-2 border-border">
              {showSelection && (
                <TableHead className="w-8 whitespace-nowrap py-1 font-semibold">
                  <Checkbox
                    checked={selectedIds.length === assets.length && assets.length > 0}
                    onCheckedChange={handleSelectAll} />
                </TableHead>
              )}
              <TableHead className="w-12 whitespace-nowrap text-xs py-1 font-semibold">#</TableHead>
              {activeColumns.map((column) => {
                const w = columnWidths[column.id];
                return (
                  <TableHead
                    key={column.id}
                    className={`whitespace-nowrap cursor-pointer select-none hover:bg-muted/50 text-xs py-1.5 font-semibold relative group ${
                    column.id === "cost" ? "text-right" : ""} ${sortColumn === column.id ? "bg-accent/50" : ""}`}
                    style={w ? { width: w, minWidth: w } : undefined}
                    onClick={() => handleSort(column.id)}>
                    <div className={`flex items-center gap-1 ${column.id === "cost" ? "justify-end" : ""}`}>
                      {column.label}
                      {getSortIndicator(column.id) &&
                        <span className="text-primary">{getSortIndicator(column.id)}</span>
                      }
                    </div>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 group-hover:opacity-100 bg-border hover:bg-primary transition-opacity"
                      onMouseDown={(e) => {
                        const th = e.currentTarget.parentElement;
                        handleResizeStart(e, column.id, th?.offsetWidth || 100);
                      }}
                    />
                  </TableHead>
                );
              })}
              <TableHead className="w-10 whitespace-nowrap text-xs py-1 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ?
            <TableRow>
                <TableCell
                colSpan={activeColumns.length + 3}
                className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm">
                      {(filters.search || filters.status || filters.type) 
                        ? "No assets match your filters" 
                        : "No assets yet"}
                    </span>
                    {!(filters.search || filters.status || filters.type) && (
                      <Button size="sm" variant="outline" onClick={() => navigate("/assets/add")} className="text-xs">
                        Add your first asset
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow> :

            assets.map((asset: any, index: number) =>
            <TableRow
              key={asset.id}
              className="cursor-pointer hover:bg-muted/50 border-b border-border transition-colors"
              onClick={() => navigate(`/assets/detail/${asset.asset_tag || asset.id}`)}>

                  {showSelection && (
                    <TableCell onClick={(e) => e.stopPropagation()} className="whitespace-nowrap py-1">
                      <Checkbox
                        checked={selectedIds.includes(asset.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(asset.id, checked as boolean)
                        } />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-xs py-1.5 text-muted-foreground">
                    {(page - 1) * pageSize + index + 1}
                  </TableCell>
                  {activeColumns.map((column) => {
                const w = columnWidths[column.id];
                return (
              <TableCell
                key={column.id}
                className={`whitespace-nowrap text-xs py-1.5 ${
                column.id === "cost" ? "text-right" : ""}`}
                style={w ? { width: w, minWidth: w, maxWidth: w, overflow: 'hidden', textOverflow: 'ellipsis' } : undefined}>

                      {renderCell(asset, column.id)}
                    </TableCell>
                );
              })}
                  <TableCell onClick={(e) => e.stopPropagation()} className="whitespace-nowrap py-1">
                    <AssetActionsMenu asset={asset} />
                  </TableCell>
                </TableRow>
            )
            }
          </TableBody>
        </table>
      </div>

      {/* Sticky Bottom Pagination */}
      <div className="shrink-0 bg-background border-t px-6 py-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {assets.length === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, totalCount)} of {totalCount}
        </span>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                const newSize = Number(value);
                setPageSize(newSize);
                setPage(1);
                saveListPreferences(newSize, sortColumn, sortDirection);
              }}>

              <SelectTrigger className="w-[70px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) =>
                <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-0.5">
            








            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}>

              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="mx-1.5 text-muted-foreground">
              {page}/{totalPages || 1}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}>

              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            








          </div>
        </div>
      </div>
    </div>);

}