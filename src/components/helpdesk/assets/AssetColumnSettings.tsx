import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCcw, Lock, Loader2 } from "lucide-react";
import { useUISettings, AssetColumnSetting } from "@/hooks/useUISettings";
import { toast } from "sonner";

export interface AssetColumn {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean;
  required?: boolean;
  order_index: number;
  category?: "asset" | "linking" | "event";
}

// System-controlled column order - positions are FIXED and cannot be changed by users
const SYSTEM_COLUMN_ORDER: AssetColumn[] = [
  { id: "asset_photo", label: "Image", visible: false, order_index: 0, category: "asset" },
  { id: "asset_tag", label: "Asset Tag ID", visible: true, locked: true, required: true, order_index: 1, category: "asset" },
  { id: "status", label: "Status", visible: true, order_index: 2, category: "event" },
  { id: "category", label: "Category", visible: true, order_index: 3, category: "linking" },
  { id: "make", label: "Make", visible: true, order_index: 4, category: "asset" },
  { id: "model", label: "Model", visible: true, order_index: 5, category: "asset" },
  { id: "serial_number", label: "Serial No", visible: true, order_index: 6, category: "asset" },
  { id: "asset_configuration", label: "Asset Configuration", visible: false, order_index: 7, category: "asset" },
  { id: "description", label: "Description", visible: false, order_index: 8, category: "asset" },
  { id: "cost", label: "Cost", visible: true, order_index: 9, category: "asset" },
  { id: "purchase_date", label: "Purchase Date", visible: false, order_index: 10, category: "asset" },
  { id: "purchased_from", label: "Purchased From", visible: false, order_index: 11, category: "asset" },
  { id: "asset_classification", label: "Asset Classification", visible: false, order_index: 12, category: "asset" },
  { id: "department", label: "Department", visible: false, order_index: 13, category: "linking" },
  { id: "location", label: "Location", visible: true, order_index: 14, category: "linking" },
  { id: "site", label: "Site", visible: false, order_index: 15, category: "linking" },
  { id: "event_date", label: "Event Date", visible: false, order_index: 16, category: "event" },
  { id: "event_due_date", label: "Event Due Date", visible: false, order_index: 17, category: "event" },
  { id: "event_notes", label: "Event Notes", visible: false, order_index: 18, category: "event" },
  { id: "created_by", label: "Created By", visible: false, order_index: 19, category: "asset" },
  { id: "created_at", label: "Date Created", visible: false, order_index: 20, category: "asset" },
  { id: "assigned_to", label: "Assigned To", visible: true, order_index: 21, category: "event" },
];

const CATEGORY_LABELS: Record<string, string> = {
  asset: "Asset Fields",
  linking: "Linking Fields",
  event: "Event Fields",
};

interface AssetColumnSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColumnsChange?: (columns: AssetColumn[]) => void;
}

export function AssetColumnSettings({ open, onOpenChange, onColumnsChange }: AssetColumnSettingsProps) {
  const [columns, setColumns] = useState<AssetColumn[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { assetColumns, isLoading, isAuthenticated, updateAssetColumns } = useUISettings();

  // Load saved columns on mount - merge saved visibility with system order
  useEffect(() => {
    if (open) {
      setColumns(getAssetColumnSettingsFromDb(assetColumns));
    }
  }, [open, assetColumns]);

  const handleToggle = (columnId: string, checked: boolean) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId && !col.locked && !col.required
          ? { ...col, visible: checked }
          : col
      )
    );
  };

  const handleReset = () => {
    setColumns([...SYSTEM_COLUMN_ORDER]);
  };

  const handleSave = async () => {
    // Save visibility state only
    const visibilityState: AssetColumnSetting[] = columns.map(col => ({ id: col.id, visible: col.visible }));
    
    if (isAuthenticated) {
      setIsSaving(true);
      try {
        await updateAssetColumns(visibilityState);
        toast.success("Column settings saved");
      } catch (error) {
        toast.error("Failed to save column settings");
        console.error("Failed to save asset columns:", error);
      } finally {
        setIsSaving(false);
      }
    }
    
    onColumnsChange?.(columns);
    onOpenChange(false);
  };

  const handleShowAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const handleHideAll = () => {
    setColumns(prev =>
      prev.map(col => (col.locked || col.required ? col : { ...col, visible: false }))
    );
  };

  const visibleCount = columns.filter(c => c.visible).length;

  // Group columns by category while maintaining order_index within each group
  const groupedColumns = columns.reduce((acc, col) => {
    const category = col.category || "asset";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(col);
    return acc;
  }, {} as Record<string, AssetColumn[]>);

  // Sort each group by order_index
  Object.keys(groupedColumns).forEach(category => {
    groupedColumns[category].sort((a, b) => a.order_index - b.order_index);
  });

  const categoryOrder = ["asset", "linking", "event"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Setup Columns</span>
            <span className="text-sm font-normal text-muted-foreground">
              {visibleCount} of {columns.length} visible
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure which columns are visible in the asset list
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground mb-2">
          Column order is system-controlled. You can only show or hide columns.
          {isAuthenticated && <span className="block mt-1">Settings sync across all your devices.</span>}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={handleShowAll}>
                Show All
              </Button>
              <Button variant="outline" size="sm" onClick={handleHideAll}>
                Hide All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto gap-1">
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            </div>

        <div className="relative">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {categoryOrder.map((category) => {
                  const categoryColumns = groupedColumns[category] || [];
                  if (categoryColumns.length === 0) return null;
                  const visibleInCategory = categoryColumns.filter(c => c.visible).length;
                  
                  return (
                    <div key={category}>
                      <div className="sticky top-0 bg-background py-1.5 mb-2 border-b">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {CATEGORY_LABELS[category]}
                          <span className="ml-2 font-normal text-[10px]">
                            ({visibleInCategory} of {categoryColumns.length})
                          </span>
                        </span>
                      </div>
                      <div className="space-y-1">
                        {categoryColumns.map((column) => (
                          <div
                            key={column.id}
                            className="flex items-center gap-3 p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              id={`col-${column.id}`}
                              checked={column.visible}
                              onCheckedChange={(checked) => handleToggle(column.id, !!checked)}
                              disabled={column.locked || column.required}
                            />
                            <Label
                              htmlFor={`col-${column.id}`}
                              className={`flex-1 cursor-pointer ${column.locked || column.required ? "text-muted-foreground" : ""}`}
                            >
                              {column.label}
                              {(column.locked || column.required) && (
                                <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Lock className="h-3 w-3" />
                                  required
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            {/* Scroll fade indicator */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
          </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to get column settings from database settings
function getAssetColumnSettingsFromDb(savedSettings?: AssetColumnSetting[]): AssetColumn[] {
  if (savedSettings && savedSettings.length > 0) {
    return SYSTEM_COLUMN_ORDER.map(systemCol => {
      const savedCol = savedSettings.find(c => c.id === systemCol.id);
      return savedCol ? { ...systemCol, visible: savedCol.visible } : systemCol;
    }).sort((a, b) => a.order_index - b.order_index);
  }
  return [...SYSTEM_COLUMN_ORDER].sort((a, b) => a.order_index - b.order_index);
}

// Export helper to get current column settings - for use in non-hook contexts
// This is a synchronous fallback that returns defaults (actual settings come from hook)
export function getAssetColumnSettings(): AssetColumn[] {
  return [...SYSTEM_COLUMN_ORDER].sort((a, b) => a.order_index - b.order_index);
}

// Export for use in exports and other features
export { SYSTEM_COLUMN_ORDER };
