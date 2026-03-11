import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showRowsPerPage?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const PaginationControls = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showRowsPerPage = false,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [100, 250, 500],
}: PaginationControlsProps) => {
  if (totalPages <= 1 && !showRowsPerPage) return null;

  const effectivePageSize = pageSize ?? itemsPerPage;
  const start = totalItems > 0 ? (currentPage - 1) * effectivePageSize + 1 : 0;
  const end = Math.min(currentPage * effectivePageSize, totalItems);

  return (
    <div className="shrink-0 flex items-center justify-between border-t px-3 py-2 bg-card">
      {showRowsPerPage && onPageSizeChange ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <Select
            value={String(effectivePageSize)}
            onValueChange={(v) => {
              onPageSizeChange(Number(v));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-7 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {totalItems > 0 ? `Showing ${start}–${end} of ${totalItems}` : "No results"}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 ml-2">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-1">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
