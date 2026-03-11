import { LucideIcon, PackageOpen, SearchX } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  search?: string;
  onClearSearch?: () => void;
}

export function EmptyState({ icon: Icon = PackageOpen, title, subtitle, search, onClearSearch }: EmptyStateProps) {
  if (search) {
    return (
      <div className="flex flex-col items-center gap-1.5 text-muted-foreground py-10">
        <SearchX className="h-6 w-6 opacity-40" />
        <p className="text-xs">No assets match "{search}"</p>
        {onClearSearch && (
          <button onClick={onClearSearch} className="text-xs text-primary hover:underline mt-1">
            Clear search
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 text-muted-foreground py-10">
      <Icon className="h-6 w-6 opacity-40" />
      <p className="text-xs">{title}</p>
      {subtitle && <p className="text-xs opacity-60">{subtitle}</p>}
    </div>
  );
}
