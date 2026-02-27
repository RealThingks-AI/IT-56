import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Settings, FileSpreadsheet, Settings2, ChevronDown, CheckSquare, UserCheck, Wrench, Package, Trash2 } from "lucide-react";
import { GlobalAssetSearch } from "./GlobalAssetSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AssetColumnSettings, SYSTEM_COLUMN_ORDER } from "./AssetColumnSettings";
import { useUISettings } from "@/hooks/useUISettings";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AssetModuleTopBarProps {
  onColumnsChange?: () => void;
  onManageDashboard?: () => void;
  onSearch?: (query: string) => void;
  showColumnSettings?: boolean;
  showExport?: boolean;
  children?: React.ReactNode;
  exportData?: any[];
  exportFilename?: string;
  bulkSelectMode?: boolean;
  onBulkSelectToggle?: (enabled: boolean) => void;
  selectedCount?: number;
  hideSearchAndAdd?: boolean;
  bulkActions?: {
    handleCheckOut: () => void;
    handleCheckIn: () => void;
    handleMaintenance: () => void;
    handleDispose: () => void;
    handleDelete: () => void;
  } | null;
}

// XLSX export utility
const exportToXLSX = async (data: any[], filename: string, columns: { id: string; label: string }[]) => {
  if (!data || data.length === 0) {
    toast.error("No data to export");
    return;
  }

  const resolveValue = (item: any, colId: string): string => {
    switch (colId) {
      case "asset_tag": return item.asset_tag || "";
      case "category": return item.category?.name || "";
      case "status": return item.status || "";
      case "make": return item.make?.name || "";
      case "model": return item.model || "";
      case "serial_number": return item.serial_number || "";
      case "assigned_to": {
        const assignedUser = item.assigned_user;
        return assignedUser?.name || assignedUser?.email || item.assigned_to || "";
      }
      case "location": return item.location?.name || "";
      case "site": return item.location?.site?.name || "";
      case "department": return item.department?.name || "";
      case "cost": return item.purchase_price?.toString() || "";
      case "purchase_date": return item.purchase_date || "";
      case "purchased_from": return item.vendor?.name || "";
      case "description": return item.description || "";
      case "created_at": return item.created_at || "";
      case "created_by": {
        const creator = item.created_user;
        return creator?.name || creator?.email || item.created_by || "";
      }
      default: return "";
    }
  };

  const rows = data.map(item => {
    const row: Record<string, string> = {};
    columns.forEach(col => {
      row[col.label] = resolveValue(item, col.id);
    });
    return row;
  });

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assets");
  XLSX.writeFile(wb, `${filename}.xlsx`);

  toast.success(`Exported ${data.length} records to ${filename}.xlsx`);
};

export function AssetModuleTopBar({ 
  onColumnsChange, 
  onManageDashboard, 
  onSearch, 
  showColumnSettings = true, 
  showExport = true, 
  children,
  exportData,
  exportFilename = "assets-export",
  bulkSelectMode = false,
  onBulkSelectToggle,
  selectedCount = 0,
  bulkActions,
  hideSearchAndAdd = false,
}: AssetModuleTopBarProps) {
  const navigate = useNavigate();
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

  const { assetColumns: savedColumns } = useUISettings();

  // Build visible columns from saved settings or defaults
  const getVisibleColumnsForExport = () => {
    const columns = savedColumns && savedColumns.length > 0
      ? SYSTEM_COLUMN_ORDER.map(systemCol => {
          const savedCol = savedColumns.find(c => c.id === systemCol.id);
          return savedCol ? { ...systemCol, visible: savedCol.visible } : systemCol;
        })
      : [...SYSTEM_COLUMN_ORDER];
    return columns
      .filter(c => c.visible)
      .sort((a, b) => a.order_index - b.order_index);
  };

  const handleExportToExcel = () => {
    const visibleColumns = getVisibleColumnsForExport();
    
    if (exportData && exportData.length > 0) {
      exportToXLSX(exportData, exportFilename, visibleColumns);
    } else {
      toast.info("No data available to export. Load assets first.");
    }
  };

  const portalTarget = document.getElementById("module-header-portal");

  const topBarContent = (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Left side - Search and Add Asset */}
          {!hideSearchAndAdd && (
            <div className="flex items-center gap-2">
              <GlobalAssetSearch />
              <Button
                size="sm"
                onClick={() => navigate("/assets/add")}
                className="gap-1 h-7 px-3"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="text-xs">Add Asset</span>
              </Button>
            </div>
          )}

          {/* Middle - Children (filters from parent pages) */}
          {children}

          {/* Right side - Actions dropdown + Manage Dashboard */}
          <div className="flex items-center gap-1 ml-auto">
            <TooltipProvider delayDuration={300}>
              {/* Manage Dashboard Button */}
              {onManageDashboard && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onManageDashboard}
                      className="h-7 w-7"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Manage Dashboard</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>

            {/* Actions Dropdown - hide when no useful actions */}
            {(showColumnSettings || showExport || onBulkSelectToggle) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    Actions
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover">
                  {showColumnSettings && onColumnsChange && (
                    <DropdownMenuItem onClick={() => setColumnSettingsOpen(true)}>
                      <Settings className="mr-2 h-3.5 w-3.5" />
                      Customize Columns
                    </DropdownMenuItem>
                  )}
                  {showExport && (
                    <DropdownMenuItem onClick={handleExportToExcel}>
                      <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                      Export to Excel
                    </DropdownMenuItem>
                  )}
                  {onBulkSelectToggle && (
                    <DropdownMenuItem onClick={() => onBulkSelectToggle?.(!bulkSelectMode)}>
                      <CheckSquare className="mr-2 h-3.5 w-3.5" />
                      {bulkSelectMode ? "Exit Bulk Select" : "Bulk Select"}
                    </DropdownMenuItem>
                  )}

                  {/* Bulk actions - only when in bulk select mode with items selected */}
                  {bulkSelectMode && selectedCount > 0 && bulkActions && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={bulkActions.handleCheckOut}>
                        <UserCheck className="mr-2 h-3.5 w-3.5" />
                        Check Out ({selectedCount})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={bulkActions.handleCheckIn}>
                        <UserCheck className="mr-2 h-3.5 w-3.5" />
                        Check In ({selectedCount})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={bulkActions.handleMaintenance}>
                        <Wrench className="mr-2 h-3.5 w-3.5" />
                        Repair ({selectedCount})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={bulkActions.handleDispose}>
                        <Package className="mr-2 h-3.5 w-3.5" />
                        Dispose ({selectedCount})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={bulkActions.handleDelete} className="text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete ({selectedCount})
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
  );

  return (
    <>
      {portalTarget ? createPortal(topBarContent, portalTarget) : (
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm px-6 py-3">
          {topBarContent}
        </div>
      )}

      <AssetColumnSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        onColumnsChange={() => onColumnsChange?.()}
      />
    </>
  );
}
