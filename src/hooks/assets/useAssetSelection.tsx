import { useState, useCallback } from "react";

interface SelectionItem {
  id: string;
  [key: string]: any;
}

/**
 * Shared selection logic for asset action pages (checkout, checkin, dispose).
 * Supports cross-search selection persistence via a cache Map.
 */
export function useAssetSelection<T extends SelectionItem>(
  getItemId: (item: T) => string = (item) => item.id
) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCache, setSelectedCache] = useState<Map<string, T>>(new Map());

  const toggleItem = useCallback(
    (item: T | string) => {
      const id = typeof item === "string" ? item : getItemId(item);
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((x) => x !== id);
        }
        // Cache on select
        if (typeof item !== "string") {
          setSelectedCache((prevCache) => {
            const next = new Map(prevCache);
            next.set(id, item);
            return next;
          });
        }
        return [...prev, id];
      });
    },
    [getItemId]
  );

  const toggleAll = useCallback(
    (visibleItems: T[], allVisibleSelected: boolean) => {
      if (allVisibleSelected) {
        // Deselect only visible items, preserve cross-search selections
        const visibleIdSet = new Set(visibleItems.map(getItemId));
        setSelectedIds((prev) => prev.filter((id) => !visibleIdSet.has(id)));
        setSelectedCache((prev) => {
          const next = new Map(prev);
          visibleIdSet.forEach((id) => next.delete(id));
          return next;
        });
      } else {
        // Add visible items to selection
        const newIds = visibleItems.map(getItemId);
        setSelectedIds((prev) => [...new Set([...prev, ...newIds])]);
        setSelectedCache((prev) => {
          const next = new Map(prev);
          visibleItems.forEach((item) => next.set(getItemId(item), item));
          return next;
        });
      }
    },
    [getItemId]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectedCache(new Map());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  );

  return {
    selectedIds,
    selectedCache,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    selectedCount: selectedIds.length,
  };
}
