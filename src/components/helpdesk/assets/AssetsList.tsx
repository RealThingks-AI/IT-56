import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { format } from "date-fns";
import { SYSTEM_COLUMN_ORDER } from "./AssetColumnSettings";
import { AssetPhotoPreview } from "./AssetPhotoPreview";
import { AssetActionsMenu } from "./AssetActionsMenu";
import { useUISettings } from "@/hooks/useUISettings";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";

interface AssetsListProps {
  filters?: Record<string, any>;
  onSelectionChange?: (selectedIds: string[], actions: any) => void;
  onDataLoad?: (data: any[]) => void;
}

type SortDirection = "asc" | "desc" | null;
type SortColumn = string | null;

const PAGE_SIZE_OPTIONS = [25, 50, 100];

// Column minimum widths for proper spacing
const COLUMN_MIN_WIDTHS: Record<string, string> = {
  asset_tag: "min-w-[100px]",
  category: "min-w-[90px]",
  status: "min-w-[90px]",
  make: "min-w-[80px]",
  model: "min-w-[80px]",
  serial_number: "min-w-[100px]",
  assigned_to: "min-w-[100px]",
  asset_configuration: "min-w-[140px]",
  description: "min-w-[150px]",
  cost: "min-w-[90px]",
  purchase_date: "min-w-[100px]",
  purchased_from: "min-w-[100px]",
  location: "min-w-[80px]",
  site: "min-w-[60px]",
  department: "min-w-[90px]",
  asset_classification: "min-w-[120px]",
  asset_photo: "min-w-[60px]",
  event_date: "min-w-[100px]",
  event_due_date: "min-w-[100px]",
  event_notes: "min-w-[150px]",
  created_by: "min-w-[100px]",
  created_at: "min-w-[100px]",
};

// Status labels and badge classes mapping
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  in_use: { label: "In Use", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  maintenance: { label: "Maintenance", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  retired: { label: "Retired", className: "bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-400" },
  disposed: { label: "Disposed", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  lost: { label: "Lost", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
};

export function AssetsList({
  filters = {},
  onSelectionChange,
  onDataLoad
}: AssetsListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Load column settings from database via hook
  const { assetColumns: savedColumns } = useUISettings();

  // Merge saved visibility with system column order
  const visibleColumns = useMemo(() => {
    if (savedColumns && savedColumns.length > 0) {
      return SYSTEM_COLUMN_ORDER.map(systemCol => {
        const savedCol = savedColumns.find(c => c.id === systemCol.id);
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
      let query = supabase
        .from("itam_assets")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,asset_tag.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
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
    staleTime: 30000,
  });

  // Fetch paginated assets with related data
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["helpdesk-assets", filters, page, pageSize, sortColumn, sortDirection],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          location:itam_locations(id, name, site:itam_sites(id, name)),
          department:itam_departments(id, name),
          make:itam_makes(id, name),
          vendor:itam_vendors(id, name)
        `)
        .eq("is_active", true)
        .range(from, to);

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,asset_tag.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
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
    staleTime: 30000,
  });

  // Notify parent when data changes (for export)
  useEffect(() => {
    if (onDataLoad && assets.length > 0) {
      onDataLoad(assets);
    }
  }, [assets, onDataLoad]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
      toast.success("Assets updated");
      setSelectedIds([]);
    },
  });

  const deleteAssets = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_active: false })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
      toast.success("Assets deleted");
      setSelectedIds([]);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? assets.map((a: any) => a.id) : [];
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected, bulkActions);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedIds, id]
      : selectedIds.filter((sid) => sid !== id);
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected, bulkActions);
  };

  const bulkActions = {
    handleCheckOut: () => updateStatus.mutate({ ids: selectedIds, status: ASSET_STATUS.IN_USE }),
    handleCheckIn: () => updateStatus.mutate({ ids: selectedIds, status: ASSET_STATUS.AVAILABLE }),
    handleMaintenance: () => updateStatus.mutate({ ids: selectedIds, status: ASSET_STATUS.MAINTENANCE }),
    handleDispose: () => updateStatus.mutate({ ids: selectedIds, status: ASSET_STATUS.DISPOSED }),
    handleDelete: () => deleteAssets.mutate(selectedIds),
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const formatCurrency = (amount: number | null, asset?: any) => {
    if (amount === null || amount === undefined) return "—";
    const currency = asset?.custom_fields?.currency || "INR";
    const currencySymbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
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
  const activeColumns = visibleColumns
    .filter((c) => c.visible)
    .sort((a, b) => a.order_index - b.order_index);

  // Render cell based on column ID - no bold text, plain status
  const renderCell = (asset: any, columnId: string) => {
    const customFields = asset.custom_fields || {};

    switch (columnId) {
      case "asset_photo":
        const photoUrl = customFields.photo_url;
        return (
          <AssetPhotoPreview 
            photoUrl={photoUrl} 
            assetName={asset.name || asset.asset_tag} 
          />
        );

      case "asset_tag":
        return (
          <span className="text-primary hover:underline cursor-pointer">
            {asset.asset_tag || "—"}
          </span>
        );

      case "make":
        return asset.make?.name || "—";

      case "cost":
        return formatCurrency(asset.purchase_price, asset);

      case "created_by":
        return "—";

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

      case "asset_classification":
        return customFields.classification || "—";

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
        // Display raw assigned_to ID or "Unassigned"
        return asset.assigned_to || "—";

      case "event_date":
        return formatDate(asset.checked_out_at);

      case "event_due_date":
        return formatDate(asset.expected_return_date);

      case "event_notes":
        return asset.check_out_notes || "—";

      case "status":
        const statusConfig = STATUS_CONFIG[asset.status];
        if (statusConfig) {
          return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          );
        }
        return asset.status?.replace("_", " ") || "—";

      default:
        return "—";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 whitespace-nowrap">
                <Checkbox
                  checked={selectedIds.length === assets.length && assets.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              {activeColumns.map((column) => (
                <TableHead
                  key={column.id}
                  className={`whitespace-nowrap cursor-pointer select-none hover:bg-muted/50 ${
                    COLUMN_MIN_WIDTHS[column.id] || ""
                  } ${column.id === "cost" ? "text-right" : ""}`}
                  onClick={() => handleSort(column.id)}
                >
                  <div
                    className={`flex items-center gap-1 ${
                      column.id === "cost" ? "justify-end" : ""
                    }`}
                  >
                    {column.label}
                    {getSortIndicator(column.id) && (
                      <span className="text-primary">{getSortIndicator(column.id)}</span>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-12 whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeColumns.length + 2}
                  className="text-center text-muted-foreground py-8"
                >
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset: any, index: number) => (
                <TableRow
                  key={asset.id}
                  className={`cursor-pointer hover:bg-muted/50 ${
                    index % 2 === 1 ? "bg-muted/20" : ""
                  }`}
                  onClick={() => navigate(`/assets/detail/${asset.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()} className="whitespace-nowrap">
                    <Checkbox
                      checked={selectedIds.includes(asset.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(asset.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  {activeColumns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={`whitespace-nowrap ${
                        COLUMN_MIN_WIDTHS[column.id] || ""
                      } ${column.id === "cost" ? "text-right" : ""}`}
                    >
                      {renderCell(asset, column.id)}
                    </TableCell>
                  ))}
                  <TableCell onClick={(e) => e.stopPropagation()} className="whitespace-nowrap">
                    <AssetActionsMenu asset={asset} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sticky Bottom Pagination */}
      <div className="sticky bottom-0 bg-background border-t px-6 py-2 flex items-center justify-between text-xs z-10 -mx-3 mt-4">
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
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[60px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
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
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
