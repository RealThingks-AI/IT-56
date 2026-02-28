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

import { AssetColumnSettings } from "./AssetColumnSettings";
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
                    <DropdownMenuItem onClick={() => navigate("/assets/import-export")}>
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
