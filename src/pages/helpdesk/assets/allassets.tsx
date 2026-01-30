import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, UserCheck, Wrench, Settings, Package, ChevronDown, X } from "lucide-react";
import { AssetsList } from "@/components/helpdesk/assets/AssetsList";
import { AssetModuleTopBar } from "@/components/helpdesk/assets/AssetModuleTopBar";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function AllAssets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, any>>({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || null,
    type: null,
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkActions, setBulkActions] = useState<any>(null);
  const [assetsData, setAssetsData] = useState<any[]>([]);
  const { categories } = useAssetSetupConfig();

  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    variant: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    action: () => {},
    variant: "default",
  });

  // Sync URL params to filters
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || null;
    setFilters(prev => ({ ...prev, search, status }));
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    if (value) {
      searchParams.set("search", value);
    } else {
      searchParams.delete("search");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleStatusChange = (value: string) => {
    const status = value === "all" ? null : value;
    setFilters(prev => ({ ...prev, status }));
    if (status) {
      searchParams.set("status", status);
    } else {
      searchParams.delete("status");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleTypeChange = (value: string) => {
    const selectedCategory = value === "all" ? null : categories.find(c => c.name === value);
    setFilters(prev => ({ 
      ...prev, 
      type: selectedCategory?.id || null,
      typeName: value === "all" ? null : value 
    }));
  };

  const clearFilters = () => {
    setFilters({ search: "", status: null, type: null, typeName: null });
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = filters.search || filters.status || filters.type;

  // Confirmation handlers for destructive actions
  const confirmBulkAction = (
    title: string,
    description: string,
    action: () => void,
    variant: "default" | "destructive" = "default"
  ) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      action,
      variant,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AssetModuleTopBar 
        onColumnsChange={() => {/* React Query cache is auto-invalidated by useUISettings */}}
        onSearch={(query) => handleSearchChange(query)}
        exportData={assetsData}
        exportFilename="assets-export"
      >
        {/* Unified Filter Row - inside top bar */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Status Filter */}
          <Select
            value={filters.status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select
            value={filters.typeName || "all"}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bulk Actions */}
          {selectedAssetIds.length > 0 && bulkActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Bulk ({selectedAssetIds.length})
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={bulkActions.handleCheckOut}>
                  <UserCheck className="mr-2 h-3.5 w-3.5" />
                  Check Out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={bulkActions.handleCheckIn}>
                  <UserCheck className="mr-2 h-3.5 w-3.5" />
                  Check In
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => confirmBulkAction(
                    "Send to Maintenance",
                    `Are you sure you want to mark ${selectedAssetIds.length} asset(s) as under maintenance?`,
                    bulkActions.handleMaintenance
                  )}
                >
                  <Wrench className="mr-2 h-3.5 w-3.5" />
                  Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => confirmBulkAction(
                    "Dispose Assets",
                    `Are you sure you want to dispose ${selectedAssetIds.length} asset(s)? This will mark them as disposed.`,
                    bulkActions.handleDispose,
                    "destructive"
                  )}
                >
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  Dispose
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => confirmBulkAction(
                    "Delete Assets",
                    `Are you sure you want to delete ${selectedAssetIds.length} asset(s)? This action cannot be undone.`,
                    bulkActions.handleDelete,
                    "destructive"
                  )}
                  className="text-destructive"
                >
                  <Package className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1 text-xs px-2">
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </AssetModuleTopBar>

      <div className="px-3 py-2 space-y-2">
        {/* Active Filters Display - Compact */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Filters:</span>
            {filters.search && (
              <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                {filters.search}
                <X
                  className="h-2.5 w-2.5 cursor-pointer"
                  onClick={() => handleSearchChange("")}
                />
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5 capitalize">
                {filters.status.replace("_", " ")}
                <X
                  className="h-2.5 w-2.5 cursor-pointer"
                  onClick={() => handleStatusChange("all")}
                />
              </Badge>
            )}
            {filters.typeName && (
              <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                {filters.typeName}
                <X
                  className="h-2.5 w-2.5 cursor-pointer"
                  onClick={() => handleTypeChange("all")}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Assets List */}
        <AssetsList
          filters={filters}
          onSelectionChange={(selectedIds, actions) => {
            setSelectedAssetIds(selectedIds);
            setBulkActions(actions);
          }}
          onDataLoad={(data) => setAssetsData(data)}
        />
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={() => {
          confirmDialog.action();
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Confirm"
        variant={confirmDialog.variant}
      />
    </div>
  );
}
