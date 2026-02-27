import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Columns3 } from "lucide-react";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

interface ColumnVisibilityToggleProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export const ColumnVisibilityToggle = ({
  columns,
  onColumnsChange
}: ColumnVisibilityToggleProps) => {
  const [open, setOpen] = useState(false);

  const toggleColumn = (id: string) => {
    const updated = columns.map(col =>
      col.id === id ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updated);
  };

  const visibleCount = columns.filter(c => c.visible).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5">
          <Columns3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Columns</span>
          <span className="text-xs text-muted-foreground">({visibleCount})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium mb-2">Toggle Columns</p>
          {columns.map(column => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                id={column.id}
                checked={column.visible}
                onCheckedChange={() => toggleColumn(column.id)}
              />
              <label
                htmlFor={column.id}
                className="text-sm cursor-pointer flex-1"
              >
                {column.label}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
