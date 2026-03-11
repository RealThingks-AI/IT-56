import { useState } from "react";
import { PackageOpen } from "lucide-react";

interface AssetThumbnailProps {
  url?: string | null;
  name?: string;
  onClick?: () => void;
}

export const AssetThumbnail = ({ url, name, onClick }: AssetThumbnailProps) => {
  const [error, setError] = useState(false);
  const isClickable = !!onClick;
  if (!url || error) {
    return (
      <div className="h-7 w-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
        <PackageOpen className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name || "Asset"}
      className="h-7 w-7 rounded object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
      onError={() => setError(true)}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onKeyDown={(e) => { if (isClickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick?.(); } }}
      loading="lazy"
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `View ${name || "asset"} photo` : undefined}
    />
  );
};
