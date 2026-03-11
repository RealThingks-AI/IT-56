import { useState, useMemo, useCallback } from "react";
import type { SortConfig } from "@/components/helpdesk/SortableTableHeader";

interface UseSortableAssetsOptions {
  initialColumn?: string;
  initialDirection?: "asc" | "desc" | null;
}

/**
 * Shared sorting logic for asset tables.
 * Extracts the common sort handler and sorted-data computation.
 */
export function useSortableAssets<T>(
  data: T[],
  getColumnValue: (item: T, column: string) => string | number,
  options: UseSortableAssetsOptions = {}
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: options.initialColumn || "name",
    direction: options.initialDirection ?? "asc",
  });

  const handleSort = useCallback((column: string) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column
          ? prev.direction === "asc"
            ? "desc"
            : prev.direction === "desc"
            ? null
            : "asc"
          : "asc",
    }));
  }, []);

  const sortedData = useMemo(() => {
    if (!sortConfig.direction) return data;
    return [...data].sort((a, b) => {
      const aVal = getColumnValue(a, sortConfig.column);
      const bVal = getColumnValue(b, sortConfig.column);
      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), undefined, {
          sensitivity: "base",
        });
      }
      return sortConfig.direction === "desc" ? -cmp : cmp;
    });
  }, [data, sortConfig, getColumnValue]);

  return { sortedData, sortConfig, handleSort };
}
