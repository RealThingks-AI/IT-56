import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  onClick?: () => void;
  animationDelay?: number;
}

export function AssetStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  onClick,
  animationDelay = 0,
}: AssetStatCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 border",
        "animate-fade-in hover:shadow-lg hover:-translate-y-0.5",
        onClick && "cursor-pointer hover:border-primary/30 active:scale-[0.98]"
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: "backwards" }}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Colored Icon Square */}
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center shadow-sm",
              "transition-all duration-200 group-hover:shadow-md group-hover:scale-105 group-hover:-translate-y-0.5",
              iconBgColor
            )}
          >
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>

          {/* Stats Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <h3 className="text-3xl font-bold text-foreground mt-0.5 tabular-nums">
              {value}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
