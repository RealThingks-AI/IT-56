import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface AssetSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function AssetSearchBar({
  value,
  onChange,
  placeholder = "Search tag, name, ID...",
  ariaLabel = "Search assets",
  className = "flex-1 max-w-sm",
}: AssetSearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-8 h-7 text-xs"
        aria-label={ariaLabel}
      />
    </div>
  );
}
