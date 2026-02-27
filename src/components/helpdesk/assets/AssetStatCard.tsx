import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const BORDER_COLOR_MAP: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-green-500": "#22c55e",
  "bg-purple-500": "#a855f7",
  "bg-orange-500": "#f97316",
  "bg-cyan-500": "#06b6d4",
  "bg-yellow-500": "#eab308",
  "bg-gray-500": "#6b7280",
  "bg-red-500": "#ef4444",
  "bg-indigo-500": "#6366f1",
  "bg-amber-500": "#f59e0b",
  "bg-rose-500": "#f43f5e",
  "bg-emerald-500": "#10b981",
};

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
  const borderColor = BORDER_COLOR_MAP[iconBgColor] || "hsl(var(--border))";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 ease-out border-l-[3px]",
        "animate-fade-in hover:-translate-y-0.5 hover:shadow-md",
        onClick && "cursor-pointer hover:border-primary/20 active:scale-[0.98]"
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationDuration: "350ms",
        animationFillMode: "backwards",
        borderLeftColor: borderColor,
      }}
      onClick={onClick}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              "transition-transform duration-200 group-hover:scale-105",
              iconBgColor
            )}
          >
            <Icon className={cn("w-4.5 h-4.5", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground truncate leading-none">
              {title}
            </p>
            <h3 className="font-bold text-base text-foreground mt-0.5 tabular-nums truncate leading-tight">
              {value}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground/80 mt-px truncate leading-none">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
