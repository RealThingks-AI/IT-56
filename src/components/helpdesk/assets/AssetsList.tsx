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
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Minus, Mail, ShieldCheck, RotateCcw, MoreHorizontal, ArrowUp, ArrowDown, ArrowUpDown, EyeOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, differenceInDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SYSTEM_COLUMN_ORDER } from "./AssetColumnSettings";
import { AssetPhotoPreview } from "./AssetPhotoPreview";
import { AssetActionsMenu } from "./AssetActionsMenu";
import { useUISettings } from "@/hooks/useUISettings";
import { ASSET_STATUS } from "@/lib/assets/assetStatusUtils";
import { useVerificationConfig } from "@/hooks/assets/useVerificationConfig";
import { useCurrency } from "@/hooks/useCurrency";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";

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
  verified: "min-w-[44px]",
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
  asset_photo: "min-w-[48px]",
  event_date: "min-w-[100px]",
  event_due_date: "min-w-[100px]",
  event_notes: "min-w-[140px]",
  created_by: "min-w-[100px]",
  created_at: "min-w-[100px]"
};

// Plain status labels (no pill styling)
const STATUS_LABELS: Record<string, string> = {
  available: "In Stock",
  in_use: "Checked Out",
  maintenance: "Repair",
  disposed: "Disposed",
};

export function AssetsList({
  filters = {},
  onSelectionChange,
  onDataLoad,
  showSelection = false
}: AssetsListProps) {
  const navigate = useNavigate();
  const { config: verificationConfig } = useVerificationConfig();
  const CONFIRMATION_OVERDUE_DAYS = verificationConfig.verification_period;
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [sortColumn, setSortColumn] = useState<SortColumn>("asset_id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const prefsLoadedRef = useRef(false);

  // Load column settings from database via hook
  const { assetColumns: savedColumns, uiSettings, updateUISettings } = useUISettings();

  // Column widths state - loaded from DB, saved on resize
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const latestWidthsRef = useRef<Record<string, number>>({});
  const initialWidthsCaptured = useRef(false);
  const resizeRef = useRef<{ col: string; startX: number; startW: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved column widths and list preferences from UI settings
  useEffect(() => {
    if (prefsLoadedRef.current) return;
    const saved = uiSettings?.assetColumnWidths;
    if (saved && typeof saved === 'object') {
      setColumnWidths(saved);
      latestWidthsRef.current = saved;
    }
    const listPrefs = uiSettings?.assetListPreferences;
    if (listPrefs) {
      if (listPrefs.pageSize) setPageSize(listPrefs.pageSize);
      if (listPrefs.sortColumn) setSortColumn(listPrefs.sortColumn);
      if (listPrefs.sortDirection) setSortDirection(listPrefs.sortDirection as SortDirection);
      prefsLoadedRef.current = true;
    } else if (Object.keys(uiSettings || {}).length > 0) {
      prefsLoadedRef.current = true;
    }
  }, [uiSettings]);

  // Capture initial column widths after first render to lock them
  useEffect(() => {
    if (initialWidthsCaptured.current || !tableRef.current) return;
    const headerCells = tableRef.current.querySelectorAll('thead th[data-col-id]');
    if (headerCells.length === 0) return;
    const measured: Record<string, number> = {};
    headerCells.forEach((th) => {
      const colId = (th as HTMLElement).dataset.colId;
      if (colId) {
        measured[colId] = (th as HTMLElement).offsetWidth;
      }
    });
    if (Object.keys(measured).length > 0) {
      setColumnWidths(prev => {
        const merged = { ...measured, ...prev };
        latestWidthsRef.current = merged;
        return merged;
      });
      initialWidthsCaptured.current = true;
    }
  }, [savedColumns]);

  // Debounced save of column widths
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateUISettings.mutate({ assetColumnWidths: widths });
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
      const newWidth = Math.max(80, resizeRef.current.startW + diff);
      setColumnWidths(prev => {
        const updated = { ...prev, [resizeRef.current!.col]: newWidth };
        latestWidthsRef.current = updated;
        return updated;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      resizeRef.current = null;
      // Save after resize ends — read from ref to avoid side effect in state updater
      saveColumnWidths(latestWidthsRef.current);
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
  }, [filters.search, filters.status, filters.type, filters.confirmation]);

  // Shared user search query — avoids duplicate lookups in count and data queries
  const searchTerm = filters.search ? sanitizeSearchInput(filters.search) : "";
  const { data: matchedUserIds = [] } = useQuery({
    queryKey: ["assets-user-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const { data } = await supabase
        .from("users")
        .select("id")
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      return (data || []).map(u => u.id);
    },
    enabled: !!searchTerm,
    staleTime: 5 * 60 * 1000,
  });

  // Build shared OR filter for search
  const buildSearchFilter = () => {
    if (!searchTerm) return null;
    let orFilter = `name.ilike.%${searchTerm}%,asset_tag.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`;
    if (matchedUserIds.length > 0) {
      orFilter += `,assigned_to.in.(${matchedUserIds.join(",")})`;
    }
    return orFilter;
  };

  // Combined data + count query (eliminates separate count request)
  const { data: assetsResult, isLoading } = useQuery({
    queryKey: ["helpdesk-assets", filters, page, pageSize, sortColumn, sortDirection, matchedUserIds],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const isOverdueFilter = filters.confirmation === "overdue";

      let query = supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          location:itam_locations(id, name, site:itam_sites(id, name)),
          department:itam_departments(id, name),
          make:itam_makes(id, name),
          vendor:itam_vendors(id, name)
        `, { count: "exact" })
        .eq("is_active", true);

      // Filter hidden assets unless showHidden is enabled
      if (!filters.showHidden) {
        query = query.eq("is_hidden", false);
      }

      // Overdue filter: fetch all rows for client-side filter+paginate; otherwise server-paginate
      if (!isOverdueFilter) {
        query = query.range(from, to);
      } else {
        query = query.limit(5000);
      }

      const orFilter = buildSearchFilter();
      if (orFilter) query = query.or(orFilter);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.type) {
        query = query.eq("category_id", filters.type);
      } else if (filters.typeName) {
        // Resolve category name to ID when only typeName is set (e.g. from URL params)
        const { data: catMatch } = await supabase
          .from("itam_categories")
          .select("id")
          .eq("name", filters.typeName)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (catMatch) {
          query = query.eq("category_id", catMatch.id);
        } else {
          // No matching category — return empty result
          return { data: [], count: 0 };
        }
      }
      // Confirmation status filters
      if (filters.confirmation === "confirmed") query = query.eq("confirmation_status", "confirmed");
      else if (filters.confirmation === "denied") query = query.eq("confirmation_status", "denied");
      else if (filters.confirmation === "pending") query = query.eq("confirmation_status", "pending");
      else if (filters.confirmation === "overdue") {
        // Overdue = assigned assets where last_confirmed_at is null or > 60 days
        query = query.not("assigned_to", "is", null);
      }

      // Apply sorting
      if (sortColumn && sortDirection) {
        const ascending = sortDirection === "asc";
        switch (sortColumn) {
          case "name":
            query = query.order("name", { ascending });
            break;
          case "asset_tag":
            query = query.order("asset_tag", { ascending });
            break;
          case "model":
            query = query.order("model", { ascending });
            break;
          case "status":
            query = query.order("status", { ascending });
            break;
          case "serial_number":
            query = query.order("serial_number", { ascending });
            break;
          case "description":
            query = query.order("description", { ascending });
            break;
          case "created_at":
            query = query.order("created_at", { ascending });
            break;
          case "purchase_date":
            query = query.order("purchase_date", { ascending });
            break;
          // assigned_to: server sorts by created_at as fallback; client-side sort by user name applied after fetch
          case "assigned_to":
            query = query.order("created_at", { ascending: false });
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
            query = query.order("name", { referencedTable: "itam_categories", ascending });
            break;
          case "location":
            query = query.order("name", { referencedTable: "itam_locations", ascending });
            break;
          case "department":
            query = query.order("name", { referencedTable: "itam_departments", ascending });
            break;
          case "make":
            query = query.order("name", { referencedTable: "itam_makes", ascending });
            break;
          case "asset_id":
            query = query.order("asset_id", { ascending });
            break;
          default:
            query = query.order("created_at", { ascending: false });
        }
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, count, error } = await query;
      if (error) throw error;
      let filteredData = data || [];
      // Client-side overdue filter + pagination (computed condition can't be done server-side)
      if (isOverdueFilter) {
        const now = new Date();
        filteredData = filteredData.filter((a: any) => {
          if (!a.last_confirmed_at) return true;
          return differenceInDays(now, new Date(a.last_confirmed_at)) > CONFIRMATION_OVERDUE_DAYS;
        });
        const totalOverdue = filteredData.length;
        // Client-side pagination
        filteredData = filteredData.slice(from, from + pageSize);
        return { data: filteredData, count: totalOverdue };
      }
      return { data: filteredData, count: count || 0 };
    },
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev, // Keep previous data during pagination (no loading flash)
  });

  const rawAssets = assetsResult?.data || [];
  const totalCount = assetsResult?.count || 0;

  // ── Verification actions ──
  const handleVerifyAsset = async (assetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("itam_assets").update({ confirmation_status: "confirmed", last_confirmed_at: new Date().toISOString() } as any).eq("id", assetId);
      await supabase.from("itam_asset_history").insert({ asset_id: assetId, action: "stock_verified", details: { verified_by: user?.id, method: "admin_manual" }, performed_by: user?.id });
      toast.success("Asset verified");
      invalidateAllAssetQueries(queryClient);
    } catch { toast.error("Failed to verify"); }
  };

  const handleResetVerification = async (assetId: string) => {
    try {
      await supabase.from("itam_assets").update({ confirmation_status: null, last_confirmed_at: null } as any).eq("id", assetId);
      toast.success("Verification status reset");
      invalidateAllAssetQueries(queryClient);
    } catch { toast.error("Failed to reset"); }
  };

  const handleSendVerificationEmail = async (asset: any) => {
    if (!asset.assigned_to) { toast.error("Asset is not assigned to anyone"); return; }
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
      const photoUrl = asset.custom_fields?.photo_url || null;
      const emailAssets = [{ asset_tag: asset.asset_tag || asset.asset_id || "N/A", description: asset.category?.name || asset.name || "N/A", brand: asset.make?.name || "N/A", model: asset.model || "N/A", serial_number: asset.serial_number || null, photo_url: photoUrl, confirm_url: itemId ? `${supabaseUrl}/functions/v1/asset-confirmation?action=confirm_item&token=${confirmation.token}&item_id=${itemId}` : undefined, deny_url: itemId ? `${supabaseUrl}/functions/v1/asset-confirmation?action=deny_item&token=${confirmation.token}&item_id=${itemId}` : undefined }];
      await supabase.functions.invoke("send-asset-email", { body: { templateId: "asset_confirmation", recipientEmail: recipientUser.email, assets: emailAssets, variables: { user_name: recipientUser.name || recipientUser.email, asset_count: "1", confirm_all_url: confirmAllUrl, deny_all_url: denyAllUrl } } });
      await supabase.from("itam_assets").update({ confirmation_status: "pending" } as any).eq("id", asset.id);
      toast.success("Confirmation email sent");
      invalidateAllAssetQueries(queryClient);
    } catch { toast.error("Failed to send email"); }
  };

  const { data: usersData = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email, auth_user_id, status, avatar_url").eq("status", "active").order("name");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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

  // Client-side sort for assigned_to using resolved user names (fixes stale closure bug)
  const assets = useMemo(() => {
    if (sortColumn === "assigned_to" && sortDirection && rawAssets.length > 0) {
      return [...rawAssets].sort((a: any, b: any) => {
        const aName = getUserName(a.assigned_to) || "";
        const bName = getUserName(b.assigned_to) || "";
        const cmp = aName.localeCompare(bName, undefined, { sensitivity: "base" });
        return sortDirection === "desc" ? -cmp : cmp;
      });
    }
    return rawAssets;
  }, [rawAssets, sortColumn, sortDirection, usersData]);

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
      } else if (status === ASSET_STATUS.IN_USE) {
        throw new Error('Cannot bulk-set status to "In Use". Use the Check Out workflow to assign assets to users.');
      } else if (status === ASSET_STATUS.DISPOSED) {
        const { error } = await supabase
          .from("itam_assets")
          .update({
            status,
            is_active: false,
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
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update assets");
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
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete assets");
    }
  });

  const bulkVerify = useMutation({
    mutationFn: async (ids: string[]) => {
      const now = new Date().toISOString();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("itam_assets")
        .update({ confirmation_status: "confirmed", last_confirmed_at: now } as any)
        .in("id", ids);
      if (error) throw error;
      const historyEntries = ids.map(id => ({
        asset_id: id,
        action: "bulk_verified",
        details: { bulk_action: true },
        performed_by: currentUser?.id,
      }));
      await supabase.from("itam_asset_history").insert(historyEntries);
    },
    onSuccess: () => {
      invalidateAllAssetQueries(queryClient);
      toast.success("Assets verified");
      setSelectedIds([]);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to verify assets");
    }
  });

  // Bulk hide/unhide mutation
  const bulkHide = useMutation({
    mutationFn: async ({ ids, hide }: { ids: string[]; hide: boolean }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_hidden: hide } as any)
        .in("id", ids);
      if (error) throw error;
      const historyEntries = ids.map(id => ({
        asset_id: id,
        action: hide ? "hidden" : "unhidden",
        details: { bulk_action: true },
        performed_by: currentUser?.id,
      }));
      await supabase.from("itam_asset_history").insert(historyEntries);
    },
    onSuccess: (_, { hide }) => {
      invalidateAllAssetQueries(queryClient);
      toast.success(hide ? "Assets hidden" : "Assets unhidden");
      setSelectedIds([]);
    },
    onError: () => toast.error("Failed to update visibility"),
  });

  const createBulkActions = (ids: string[]) => ({
    handleCheckOut: () => {
      toast.error("Bulk check-out is not supported. Use the individual Check Out workflow to assign assets to users or locations.");
    },
    handleCheckIn: () => updateStatus.mutate({ ids, status: ASSET_STATUS.AVAILABLE }),
    handleVerify: () => bulkVerify.mutate(ids),
    handleMaintenance: () => updateStatus.mutate({ ids, status: ASSET_STATUS.MAINTENANCE }),
    handleDispose: () => updateStatus.mutate({ ids, status: ASSET_STATUS.DISPOSED }),
    handleDelete: () => deleteAssets.mutate(ids),
    handleHide: () => bulkHide.mutate({ ids, hide: true }),
    handleUnhide: () => bulkHide.mutate({ ids, hide: false }),
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
    updateUISettings.mutate({ assetListPreferences: { pageSize: ps, sortColumn: sc, sortDirection: sd } });
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

  // Use centralized currency hook instead of local duplicate
  const { formatCurrency: hookFormatCurrency } = useCurrency();
  const formatCurrencyDisplay = (amount: number | null, asset?: any) => {
    if (amount === null || amount === undefined) return "—";
    const currency = asset?.custom_fields?.currency || "INR";
    return hookFormatCurrency(amount, currency);
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
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 text-primary" /> 
      : <ArrowDown className="h-3 w-3 text-primary" />;
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
        return formatCurrencyDisplay(asset.purchase_price, asset);

      case "created_by": {
        const createdByName = getUserName(asset.created_by);
        if (!createdByName || createdByName === "—") return "—";
        const createdByUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asset.created_by || "");
        return createdByUuid ? (
          <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/employees?user=${asset.created_by}`); }}>{createdByName}</span>
        ) : createdByName;
      }

      case "created_at":
        return formatDate(asset.created_at);

      case "description":
        return asset.description || "—";

      case "model":
        return asset.model || "—";

      case "purchase_date":
        return formatDate(asset.purchase_date);

      case "purchased_from":
        return asset.vendor?.name ? (
          <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/vendors/detail/${asset.vendor.id}`); }}>{asset.vendor.name}</span>
        ) : "—";

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

      case "assigned_to": {
        const assignedName = getUserName(asset.assigned_to);
        if (!assignedName || assignedName === "—") {
          // Show location/site name for assets checked out to a location
          if (asset.status === ASSET_STATUS.IN_USE && asset.location) {
            const locName = asset.location?.name;
            const siteName = asset.location?.site?.name;
            const displayLoc = siteName ? `${locName} (${siteName})` : locName;
            return displayLoc ? (
              <span className="text-muted-foreground italic text-xs">📍 {displayLoc}</span>
            ) : "—";
          }
          return "—";
        }
        const assignedIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asset.assigned_to || "");
        return assignedIsUuid ? (
          <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/employees?user=${asset.assigned_to}`); }}>{assignedName}</span>
        ) : assignedName;
      }

      case "event_date":
        return formatDate(asset.checked_out_at);

      case "event_due_date":
        return formatDate(asset.expected_return_date);

      case "event_notes":
        return asset.check_out_notes || "—";

      case "verified": {
        const confirmStatus = asset.confirmation_status;
        const lastConfirmed = asset.last_confirmed_at;
        const now = new Date();
        const isOverdue = !lastConfirmed || differenceInDays(now, new Date(lastConfirmed)) > CONFIRMATION_OVERDUE_DAYS;
        const isInStock = asset.status === "available" && !asset.assigned_to;
        const isAssigned = !!asset.assigned_to;

        let icon, label, color;
        if (confirmStatus === "confirmed" && !isOverdue) {
          icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
          label = `Confirmed${lastConfirmed ? ` on ${format(new Date(lastConfirmed), "dd MMM yyyy")}` : ""}`;
          color = "text-green-600";
        } else if (confirmStatus === "denied") {
          icon = <XCircle className="h-4 w-4 text-red-500" />;
          label = "Denied by user";
          color = "text-red-600";
        } else if (confirmStatus === "pending") {
          icon = <Clock className="h-4 w-4 text-blue-500" />;
          label = "Pending confirmation";
          color = "text-blue-600";
        } else if (isOverdue) {
          icon = <Clock className="h-4 w-4 text-amber-500" />;
          label = lastConfirmed ? `Overdue — last ${format(new Date(lastConfirmed), "dd MMM yyyy")}` : "Never verified";
          color = "text-amber-600";
        } else {
          icon = <Minus className="h-4 w-4 text-muted-foreground" />;
          label = "Not verified";
          color = "text-muted-foreground";
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`inline-flex items-center justify-center gap-1 mx-auto ${color} hover:opacity-80 transition-opacity`} title={label}>
                {icon}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium">{label}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleVerifyAsset(asset.id)} className="text-xs gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verify
              </DropdownMenuItem>
              {isAssigned && (
                <DropdownMenuItem onClick={() => handleSendVerificationEmail(asset)} className="text-xs gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  Send confirmation email
                </DropdownMenuItem>
              )}
              {(confirmStatus === "confirmed" || confirmStatus === "denied" || confirmStatus === "pending") && (
                <DropdownMenuItem onClick={() => handleResetVerification(asset.id)} className="text-xs gap-2">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset status
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      case "status":
        const statusBadgeStyles: Record<string, string> = {
          available: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
          in_use: "bg-sky-500/15 text-sky-700 border-sky-500/30",
          maintenance: "bg-amber-500/15 text-amber-700 border-amber-500/30",
          disposed: "bg-rose-500/15 text-rose-700 border-rose-500/30",
        };
        const badgeStyle = statusBadgeStyles[asset.status] || "bg-muted text-muted-foreground border-border";
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeStyle}`}>
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
                  <TableCell className="py-1.5"><Skeleton className="h-4 w-6" /></TableCell>
                  {activeColumns.filter(c => c.visible).slice(0, 8).map((col) => (
                    <TableCell key={col.id} className="py-1.5">
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
      <div className="flex-1 overflow-x-auto overflow-y-auto rounded-md border [background:linear-gradient(to_right,hsl(var(--background))_30%,transparent)_left,linear-gradient(to_left,hsl(var(--background))_30%,transparent)_right] [background-size:14px_100%] [background-attachment:local,local] [background-repeat:no-repeat]">
        <table ref={tableRef} className="caption-bottom text-sm" style={{ tableLayout: "fixed", width: activeColumns.length > 9 ? `${activeColumns.reduce((sum, col) => sum + (columnWidths[col.id] || 120), 0) + (showSelection ? 32 : 0) + 76}px` : "100%" }}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="border-b-2 border-border">
              {showSelection && (
                <TableHead className="whitespace-nowrap py-1 font-semibold" style={{ width: 32 }}>
                  <Checkbox
                    checked={selectedIds.length === assets.length && assets.length > 0}
                    onCheckedChange={handleSelectAll} />
                </TableHead>
              )}
              <TableHead className="whitespace-nowrap text-xs py-1 font-semibold text-center" style={{ width: 36 }}>#</TableHead>
              {activeColumns.map((column) => {
                const w = columnWidths[column.id];
                return (
                  <TableHead
                    key={column.id}
                    data-col-id={column.id}
                    className={`whitespace-nowrap cursor-pointer select-none hover:bg-muted/50 text-xs py-1 font-semibold relative group overflow-hidden ${
                    column.id === "cost" ? "text-right" : ""} ${["verified", "asset_photo"].includes(column.id) ? "text-center" : ""} ${sortColumn === column.id ? "bg-primary/5" : ""}`}
                    style={
                      column.id === "verified" ? { width: 44, minWidth: 44 } :
                      column.id === "asset_photo" ? { width: 48, minWidth: 48 } :
                      w ? { width: w, minWidth: 60 } : { minWidth: 60 }
                    }
                    onClick={() => handleSort(column.id)}>
                    <div className={`flex items-center gap-1 ${column.id === "cost" ? "justify-end" : ""} ${["verified", "asset_photo"].includes(column.id) ? "justify-center" : ""}`}>
                      {column.label}
                      {getSortIndicator(column.id) || (
                        !["verified", "asset_photo"].includes(column.id) && 
                        <ArrowUpDown className="h-3 w-3 opacity-20" />
                      )}
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
              <TableHead className="whitespace-nowrap text-xs py-1 font-semibold text-center" style={{ width: 40 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSelection && selectedIds.length > 0 && selectedIds.length === assets.length && totalCount > assets.length && (
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <TableCell colSpan={activeColumns.length + 3} className="text-center py-1.5 text-xs text-muted-foreground">
                  All {assets.length} items on this page are selected.
                </TableCell>
              </TableRow>
            )}
            {assets.length === 0 ?
            <TableRow>
                <TableCell
                colSpan={activeColumns.length + (showSelection ? 3 : 2)}
                className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm">
                      {showSelection
                        ? "No assets available to select"
                        : (filters.search || filters.status || filters.type || filters.typeName || filters.confirmation) 
                          ? "No assets match your filters" 
                          : "No assets yet"}
                    </span>
                    {!showSelection && !(filters.search || filters.status || filters.type || filters.typeName || filters.confirmation) && (
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
              className="cursor-pointer hover:bg-accent/50 border-b border-border transition-colors"
              onClick={() => navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`)}
              onMouseEnter={() => {
                const tag = String(asset.asset_tag || asset.asset_id || asset.id);
                queryClient.prefetchQuery({
                  queryKey: ["itam-asset-detail", tag],
                  queryFn: async () => {
                    const selectFields = `
                      *,
                      category:itam_categories(id, name),
                      department:itam_departments(id, name),
                      location:itam_locations(id, name, site:itam_sites(id, name)),
                      make:itam_makes(id, name),
                      vendor:itam_vendors(id, name)
                    `;
                    const { data } = await supabase
                      .from("itam_assets")
                      .select(selectFields)
                      .or(`asset_tag.eq.${tag},asset_id.eq.${tag}`)
                      .maybeSingle();
                    if (data) {
                      // Fetch assigned/checked-out user to match detail page shape
                      let assignedUser = null;
                      if (data.assigned_to) {
                        const { data: u } = await supabase.from("users").select("id, name, email").eq("id", data.assigned_to).single();
                        assignedUser = u;
                      }
                      let checkedOutUser = null;
                      if (data.checked_out_to) {
                        const { data: u } = await supabase.from("users").select("id, name, email").eq("id", data.checked_out_to).single();
                        checkedOutUser = u;
                      }
                      return { ...data, assigned_user: assignedUser, checked_out_user: checkedOutUser };
                    }
                    const { data: fallback } = await supabase
                      .from("itam_assets")
                      .select(selectFields)
                      .eq("asset_id", tag)
                      .maybeSingle();
                    if (fallback) {
                      let assignedUser = null;
                      if (fallback.assigned_to) {
                        const { data: u } = await supabase.from("users").select("id, name, email").eq("id", fallback.assigned_to).single();
                        assignedUser = u;
                      }
                      let checkedOutUser = null;
                      if (fallback.checked_out_to) {
                        const { data: u } = await supabase.from("users").select("id, name, email").eq("id", fallback.checked_out_to).single();
                        checkedOutUser = u;
                      }
                      return { ...fallback, assigned_user: assignedUser, checked_out_user: checkedOutUser };
                    }
                    return null;
                  },
                  staleTime: 60_000,
                });
              }}>

                  {showSelection && (
                    <TableCell onClick={(e) => e.stopPropagation()} className="whitespace-nowrap py-1">
                      <Checkbox
                        checked={selectedIds.includes(asset.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(asset.id, checked as boolean)
                        } />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-xs py-1 text-muted-foreground text-center">
                    {(page - 1) * pageSize + index + 1}
                  </TableCell>
                  {activeColumns.map((column) => {
                const w = columnWidths[column.id];
                const isInteractive = ["asset_photo", "verified", "assigned_to"].includes(column.id);
                return (
              <TableCell
                key={column.id}
                onClick={isInteractive ? (e) => e.stopPropagation() : undefined}
                className={`whitespace-nowrap text-xs py-1 ${
                column.id === "cost" ? "text-right" : ""} ${["verified", "asset_photo"].includes(column.id) ? "text-center" : ""}`}
                style={
                  column.id === "verified" ? { width: 44, minWidth: 44, maxWidth: 44 } :
                  column.id === "asset_photo" ? { width: 48, minWidth: 48, maxWidth: 48 } :
                  w ? { width: w, minWidth: w, maxWidth: w, overflow: 'hidden', textOverflow: 'ellipsis' } : undefined
                }>

                      {renderCell(asset, column.id)}
                    </TableCell>
                );
              })}
                  <TableCell onClick={(e) => e.stopPropagation()} className="whitespace-nowrap py-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {asset.is_hidden && (
                        <Tooltip>
                          <TooltipTrigger>
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Hidden asset</TooltipContent>
                        </Tooltip>
                      )}
                      <AssetActionsMenu asset={asset} />
                    </div>
                  </TableCell>
                </TableRow>
            )
            }
          </TableBody>
        </table>
      </div>

      {/* Sticky Bottom Pagination */}
      <div className="shrink-0 bg-background border-t shadow-[0_-1px_3px_rgba(0,0,0,0.05)] px-4 py-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {totalCount === 0 ? "No results" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
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

            {totalPages > 2 ? (
              <input
                type="number"
                min={1}
                max={totalPages || 1}
                value={page}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1 && v <= totalPages) setPage(v);
                }}
                className="w-10 h-7 text-center text-xs border rounded-md bg-background mx-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Jump to page"
              />
            ) : (
              <span className="mx-1.5 text-muted-foreground">{page}</span>
            )}
            <span className="text-muted-foreground">/{totalPages || 1}</span>

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