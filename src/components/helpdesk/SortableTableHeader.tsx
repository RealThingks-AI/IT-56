import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface SortableTableHeaderProps {
  column: string;
  label: string;
  sortConfig: SortConfig;
  onSort: (column: string) => void;
  className?: string;
}

export const SortableTableHeader = ({
  column,
  label,
  sortConfig,
  onSort,
  className,
}: SortableTableHeaderProps) => {
  const isActive = sortConfig.column === column;
  const direction = isActive ? sortConfig.direction : null;

  return (
    <TableHead
      className={cn("cursor-pointer select-none py-2", className)}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
        ) : direction === "desc" ? (
          <ArrowDown className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
        )}
      </div>
    </TableHead>
  );
};
