import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, Plus, Settings, FileSpreadsheet, CheckSquare, UserCheck, Wrench, Package, Trash2, ShieldCheck, EyeOff, Eye } from "lucide-react";
import { sanitizeSearchInput, cn } from "@/lib/utils";
import { AssetsList } from "@/components/helpdesk/assets/AssetsList";
import { AssetColumnSettings } from "@/components/helpdesk/assets/AssetColumnSettings";
import { useAssetSetupConfig } from "@/hooks/assets/useAssetSetupConfig";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ASSET_STATUS_OPTIONS, ASSET_STATUS } from "@/lib/assets/assetStatusUtils";

// Colored square indicators for status filter dropdown
const STATUS_DOT_COLORS: Record<string, string> = {
  [ASSET_STATUS.AVAILABLE]: "bg-emerald-500",
  [ASSET_STATUS.IN_USE]: "bg-sky-500",
  [ASSET_STATUS.MAINTENANCE]: "bg-amber-400",
  [ASSET_STATUS.DISPOSED]: "bg-rose-500",
};

const VERIFICATION_DOT_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500",
  denied: "bg-rose-500",
  pending: "bg-sky-500",
  overdue: "bg-amber-400",
};

// Custom SelectItem that shows a colored square instead of Check icon
const ColoredSelectItem = ({ value, label }: { value: string; label: string; color?: string }) => (
  <SelectPrimitive.Item
    value={value}
    className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=checked]:bg-primary/20 data-[state=checked]:font-medium data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
  >
    <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AllAssets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, any>>({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || null,
    type: null,
    typeName: searchParams.get("category") || null,
    warranty: searchParams.get("warranty") || null,
    recent: searchParams.get("recent") || null,
    confirmation: searchParams.get("confirmation") || null,
    showHidden: false,
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkActions, setBulkActions] = useState<any>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchParams.get("search") || "");
  const { categories } = useAssetSetupConfig();
  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; action: () => void; variant: "default" | "destructive";
  }>({ open: false, title: "", description: "", action: () => {}, variant: "default" });

  // Use subheader portal for consistency with dashboard and other pages
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setPortalTarget(document.getElementById("module-subheader-portal"));
  }, []);

  // Sync URL params to filters
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || null;
    const warranty = searchParams.get("warranty") || null;
    const recent = searchParams.get("recent") || null;
    const confirmation = searchParams.get("confirmation") || null;
    const category = searchParams.get("category") || null;
    setFilters(prev => ({ ...prev, search, status, warranty, recent, confirmation, typeName: category || prev.typeName }));
    setLocalSearch(search);
  }, [searchParams]);

  // Clear selection when exiting bulk select mode
  useEffect(() => {
    if (!bulkSelectMode) { setSelectedAssetIds([]); setBulkActions(null); }
  }, [bulkSelectMode]);

  const handleSearchChange = (value: string) => {
    const sanitized = sanitizeSearchInput(value);
    setFilters(prev => ({ ...prev, search: sanitized }));
    const newParams = new URLSearchParams(searchParams);
    if (sanitized) { newParams.set("search", sanitized); } else { newParams.delete("search"); }
    setSearchParams(newParams, { replace: true });
  };

  // Debounced live search (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChangeRef = useRef(handleSearchChange);
  handleSearchChangeRef.current = handleSearchChange;

  const handleLocalSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearchChangeRef.current(value.trim());
    }, 300);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    handleSearchChange(localSearch.trim());
  };

  const handleSearchClear = () => {
    setLocalSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    handleSearchChange("");
  };

  const handleStatusChange = (value: string) => {
    const status = value === "all" ? null : value;
    setFilters(prev => ({ ...prev, status }));
    const newParams = new URLSearchParams(searchParams);
    if (status) { newParams.set("status", status); } else { newParams.delete("status"); }
    setSearchParams(newParams, { replace: true });
  };

  const handleTypeChange = (value: string) => {
    const selectedCategory = value === "all" ? null : categories.find(c => c.name === value);
    setFilters(prev => ({ ...prev, type: selectedCategory?.id || null, typeName: value === "all" ? null : value }));
    const newParams = new URLSearchParams(searchParams);
    if (value !== "all") { newParams.set("category", value); } else { newParams.delete("category"); }
    setSearchParams(newParams, { replace: true });
  };

  const handleConfirmationChange = (value: string) => {
    const confirmation = value === "all" ? null : value;
    setFilters(prev => ({ ...prev, confirmation }));
    const newParams = new URLSearchParams(searchParams);
    if (confirmation) { newParams.set("confirmation", confirmation); } else { newParams.delete("confirmation"); }
    setSearchParams(newParams, { replace: true });
  };

  const clearFilters = () => {
    setFilters({ search: "", status: null, type: null, typeName: null, warranty: null, recent: null, confirmation: null, showHidden: false });
    setSearchParams({}, { replace: true });
    setLocalSearch("");
  };

  const toggleShowHidden = () => {
    setFilters(prev => ({ ...prev, showHidden: !prev.showHidden }));
  };

  // Only show clear when genuinely useful filters are active (not stale typeName without resolved type)
  const hasActiveFilters = filters.search || filters.status || filters.typeName || filters.warranty || filters.recent || filters.confirmation;

  const headerContent = (
    <div className="flex items-center gap-1.5 flex-1 min-w-0 px-3 py-1.5 border-b bg-background/95 backdrop-blur-sm">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={localSearch}
          onChange={(e) => handleLocalSearchChange(e.target.value)}
          className="pl-7 h-7 w-[220px] text-xs"
        />
      </form>

      {/* Add Asset */}
      <Button size="sm" onClick={() => navigate("/assets/add")} className="gap-1 h-7 px-3">
        <Plus className="h-3.5 w-3.5" />
        <span className="text-xs">Add Asset</span>
      </Button>

      {/* Filters */}
      <Select value={filters.status || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn(
          "w-[150px] h-7 text-xs",
          filters.status && "bg-primary/15 border-primary/40 text-primary font-medium"
        )}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="w-[150px] min-w-0">
          <SelectItem value="all">All Status</SelectItem>
          {ASSET_STATUS_OPTIONS.map(opt => (
            <ColoredSelectItem
              key={opt.value}
              value={opt.value}
              label={opt.label}
              color={STATUS_DOT_COLORS[opt.value] || "bg-muted-foreground"}
            />
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.typeName || "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className={cn(
          "w-[150px] h-7 text-xs",
          filters.typeName && "bg-primary/15 border-primary/40 text-primary font-medium"
        )}>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent className="w-[150px] min-w-0">
          <SelectItem value="all">All Types</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.confirmation || "all"} onValueChange={handleConfirmationChange}>
        <SelectTrigger className={cn(
          "w-[150px] h-7 text-xs",
          filters.confirmation && "bg-primary/15 border-primary/40 text-primary font-medium"
        )}>
          <SelectValue placeholder="Confirmation" />
        </SelectTrigger>
        <SelectContent className="w-[150px] min-w-0">
          <SelectItem value="all">All Verification</SelectItem>
          <ColoredSelectItem value="confirmed" label="Confirmed" color="bg-emerald-500" />
          <ColoredSelectItem value="denied" label="Denied" color="bg-rose-500" />
          <ColoredSelectItem value="pending" label="Pending" color="bg-sky-500" />
          <ColoredSelectItem value="overdue" label="Overdue" color="bg-amber-400" />
        </SelectContent>
      </Select>

      {filters.showHidden && (
        <Badge variant="outline" className="h-6 text-xs gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
          <EyeOff className="h-3 w-3" />
          Hidden
        </Badge>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1 text-xs px-2">
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}

      {/* Actions - pushed to the right */}
      <div className="ml-auto flex items-center gap-2">
        {/* Compact selection badge when bulk mode is active */}
        {bulkSelectMode && selectedAssetIds.length > 0 && (
          <Badge variant="secondary" className="text-xs h-6 gap-1">
            <CheckSquare className="h-3 w-3" />
            {selectedAssetIds.length} selected
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            <DropdownMenuItem onClick={() => setColumnSettingsOpen(true)}>
              <Settings className="mr-2 h-3.5 w-3.5" />
              Customize Columns
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/assets/advanced?tab=import-export")}>
              <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBulkSelectMode(!bulkSelectMode)}>
              <CheckSquare className="mr-2 h-3.5 w-3.5" />
              {bulkSelectMode ? "Exit Bulk Select" : "Bulk Select"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleShowHidden}>
              {filters.showHidden ? <Eye className="mr-2 h-3.5 w-3.5" /> : <EyeOff className="mr-2 h-3.5 w-3.5" />}
              {filters.showHidden ? "Show Normal Assets" : "Show Hidden Assets"}
            </DropdownMenuItem>
            {bulkSelectMode && selectedAssetIds.length > 0 && bulkActions && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Check In Assets",
                  description: `Are you sure you want to check in ${selectedAssetIds.length} asset(s)? This will mark them as In Stock and close any open assignments.`,
                  action: bulkActions.handleCheckIn,
                  variant: "default",
                })}>
                  <UserCheck className="mr-2 h-3.5 w-3.5" />Check In ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Verify Assets",
                  description: `Are you sure you want to verify ${selectedAssetIds.length} asset(s)? This will mark them as confirmed.`,
                  action: bulkActions.handleVerify,
                  variant: "default",
                })}>
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />Verify ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Send for Repair",
                  description: `Are you sure you want to send ${selectedAssetIds.length} asset(s) for repair?`,
                  action: bulkActions.handleMaintenance,
                  variant: "default",
                })}>
                  <Wrench className="mr-2 h-3.5 w-3.5" />Repair ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Dispose Assets",
                  description: `Are you sure you want to dispose ${selectedAssetIds.length} asset(s)? This will mark them as disposed.`,
                  action: bulkActions.handleDispose,
                  variant: "destructive",
                })}>
                  <Package className="mr-2 h-3.5 w-3.5" />Dispose ({selectedAssetIds.length})
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Delete Assets",
                  description: `Are you sure you want to delete ${selectedAssetIds.length} asset(s)? This action can be reversed by an administrator.`,
                  action: bulkActions.handleDelete,
                  variant: "destructive",
                })} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />Delete ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {filters.showHidden ? (
                  <DropdownMenuItem onClick={() => setConfirmDialog({
                    open: true,
                    title: "Unhide Assets",
                    description: `Are you sure you want to unhide ${selectedAssetIds.length} asset(s)? They will appear in normal views again.`,
                    action: bulkActions.handleUnhide,
                    variant: "default",
                  })}>
                    <Eye className="mr-2 h-3.5 w-3.5" />Unhide ({selectedAssetIds.length})
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setConfirmDialog({
                    open: true,
                    title: "Hide Assets",
                    description: `Are you sure you want to hide ${selectedAssetIds.length} asset(s)? They will be excluded from all normal views.`,
                    action: bulkActions.handleHide,
                    variant: "default",
                  })}>
                    <EyeOff className="mr-2 h-3.5 w-3.5" />Hide ({selectedAssetIds.length})
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Portal toolbar into layout subheader */}
      {portalTarget && createPortal(headerContent, portalTarget)}

      <div className="flex-1 overflow-hidden flex flex-col">
        <AssetsList
          filters={filters}
          showSelection={bulkSelectMode}
          onSelectionChange={(selectedIds, actions) => {
            setSelectedAssetIds(selectedIds);
            setBulkActions(actions);
          }}
        />
      </div>

      <AssetColumnSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={() => { confirmDialog.action(); setConfirmDialog(prev => ({ ...prev, open: false })); }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Confirm"
        variant={confirmDialog.variant}
      />
    </div>
  );
}
