import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

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
  style?: React.CSSProperties;
}

export const SortableTableHeader = ({
  column,
  label,
  sortConfig,
  onSort,
  className,
  style
}: SortableTableHeaderProps) => {
  const isActive = sortConfig.column === column && sortConfig.direction !== null;

  return (
    <TableHead
      style={style}
      className={cn(
        "cursor-pointer select-none py-2 font-semibold text-xs uppercase tracking-wide text-foreground/70 hover:text-foreground transition-colors",
        className
      )}
      onClick={() => onSort(column)}>
      
      <span className="inline-flex items-center gap-1 font-sans font-bold text-xs">
        {label}
        {isActive ?
        sortConfig.direction === "asc" ?
        <ArrowUp className="h-3 w-3" /> :

        <ArrowDown className="h-3 w-3" /> :


        <ArrowUpDown className="h-3 w-3 opacity-30" />
        }
      </span>
    </TableHead>);

};