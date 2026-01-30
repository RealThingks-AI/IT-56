import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Columns, GripVertical, RotateCcw, Save, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUISettings, HelpdeskColumnSetting } from "@/hooks/useUISettings";

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "ticket_number", label: "ID", visible: true, order: 0 },
  { id: "title", label: "Subject", visible: true, order: 1 },
  { id: "status", label: "Status", visible: true, order: 2 },
  { id: "priority", label: "Priority", visible: true, order: 3 },
  { id: "category", label: "Category", visible: true, order: 4 },
  { id: "assignee", label: "Assignee", visible: true, order: 5 },
  { id: "requester", label: "Requester", visible: true, order: 6 },
  { id: "created_at", label: "Created", visible: true, order: 7 },
  { id: "updated_at", label: "Updated", visible: false, order: 8 },
  { id: "sla_due_date", label: "SLA Due", visible: false, order: 9 },
  { id: "tags", label: "Tags", visible: false, order: 10 },
  { id: "queue", label: "Queue", visible: false, order: 11 },
];

export const ColumnSettingsManager = () => {
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { helpdeskColumns, isLoading, isAuthenticated, updateHelpdeskColumns } = useUISettings();

  useEffect(() => {
    if (helpdeskColumns && helpdeskColumns.length > 0) {
      // Merge with defaults to handle new columns
      const merged = DEFAULT_COLUMNS.map(defaultCol => {
        const savedCol = helpdeskColumns.find((c: HelpdeskColumnSetting) => c.id === defaultCol.id);
        return savedCol ? { ...defaultCol, visible: savedCol.visible, order: savedCol.order } : defaultCol;
      });
      setColumns(merged.sort((a, b) => a.order - b.order));
    } else {
      setColumns([...DEFAULT_COLUMNS]);
    }
  }, [helpdeskColumns]);

  const toggleColumn = (id: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === id ? { ...col, visible: !col.visible } : col
      )
    );
    setHasChanges(true);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newColumns = [...columns];
    const draggedItem = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedItem);
    
    // Update order values
    newColumns.forEach((col, i) => {
      col.order = i;
    });
    
    setColumns(newColumns);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const saveSettings = async () => {
    if (isAuthenticated) {
      setIsSaving(true);
      try {
        const settingsToSave: HelpdeskColumnSetting[] = columns.map(col => ({
          id: col.id,
          visible: col.visible,
          order: col.order,
        }));
        await updateHelpdeskColumns(settingsToSave);
        toast.success("Column settings saved");
        setHasChanges(false);
        // Dispatch event for other components to react
        window.dispatchEvent(new CustomEvent('columnSettingsChanged', { detail: columns }));
      } catch (error) {
        toast.error("Failed to save column settings");
        console.error("Failed to save helpdesk columns:", error);
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.info("Sign in to save settings across devices");
    }
  };

  const resetToDefault = async () => {
    setColumns([...DEFAULT_COLUMNS]);
    if (isAuthenticated) {
      try {
        await updateHelpdeskColumns(DEFAULT_COLUMNS.map(col => ({
          id: col.id,
          visible: col.visible,
          order: col.order,
        })));
      } catch (error) {
        console.error("Failed to reset columns:", error);
      }
    }
    setHasChanges(false);
    toast.success("Reset to default columns");
    window.dispatchEvent(new CustomEvent('columnSettingsChanged', { detail: DEFAULT_COLUMNS }));
  };

  const visibleCount = columns.filter(c => c.visible).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Column Settings</CardTitle>
              <CardDescription className="mt-1">
                {visibleCount} of {columns.length} columns visible
                {isAuthenticated && <span className="block text-xs">Settings sync across devices</span>}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" onClick={saveSettings} disabled={!hasChanges || isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : hasChanges ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Toggle columns on/off and drag to reorder. Changes apply to the ticket list view.
        </p>
        
        <div className="space-y-2">
          {columns.map((column, index) => (
            <div
              key={column.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                draggedIndex === index 
                  ? 'bg-primary/5 border-primary' 
                  : 'bg-background hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <Label 
                  htmlFor={`col-${column.id}`}
                  className={`cursor-pointer ${!column.visible ? 'text-muted-foreground' : ''}`}
                >
                  {column.label}
                </Label>
              </div>
              <Switch
                id={`col-${column.id}`}
                checked={column.visible}
                onCheckedChange={() => toggleColumn(column.id)}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Preview</h4>
          <div className="flex flex-wrap gap-2">
            {columns
              .filter(c => c.visible)
              .map(col => (
                <span 
                  key={col.id}
                  className="px-2 py-1 bg-background border rounded text-xs font-medium"
                >
                  {col.label}
                </span>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Export helper to get column settings - returns defaults (actual settings come from hook)
export const getColumnSettings = (): ColumnConfig[] => {
  return [...DEFAULT_COLUMNS].sort((a, b) => a.order - b.order);
};
