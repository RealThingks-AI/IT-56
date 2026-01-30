import { Skeleton } from "@/components/ui/skeleton";

interface SidebarSkeletonProps {
  count?: number;
  collapsed?: boolean;
}

export function SidebarSkeleton({ count = 6, collapsed = false }: SidebarSkeletonProps) {
  return (
    <div className="space-y-1 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center h-8 px-1 mx-1"
        >
          <div className="w-10 flex items-center justify-center flex-shrink-0">
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          {!collapsed && (
            <Skeleton className="h-3 flex-1 mr-2 rounded" />
          )}
        </div>
      ))}
    </div>
  );
}