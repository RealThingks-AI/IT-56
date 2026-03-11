import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  "bg-red-600": "#dc2626",
  "bg-indigo-500": "#6366f1",
  "bg-amber-500": "#f59e0b",
  "bg-rose-500": "#f43f5e",
  "bg-emerald-500": "#10b981",
  "bg-sky-500": "#0ea5e9",
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
  loading?: boolean;
  alert?: boolean;
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
  loading,
  alert = false,
}: AssetStatCardProps) {
  const borderColor = BORDER_COLOR_MAP[iconBgColor] || "hsl(var(--border))";

  if (loading) {
    return (
      <Card className="min-h-[72px] border-l-[3px]" style={{ borderLeftColor: "hsl(var(--border))" }}>
        <div className="px-3 py-2.5 flex items-center gap-2.5">
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 ease-out border-l-[3px] min-h-[72px]",
        "animate-fade-in hover:-translate-y-0.5 hover:shadow-md",
        onClick && "cursor-pointer hover:border-primary/20 active:scale-[0.98]",
        alert && "ring-1 ring-destructive/20 bg-destructive/[0.03]"
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
              "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
              "transition-transform duration-200 group-hover:scale-105",
              iconBgColor
            )}
          >
            <Icon className={cn("w-4 h-4", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground truncate leading-none">
              {title}
            </p>
            <h3 className={cn(
              "font-bold text-foreground mt-0.5 tabular-nums truncate leading-tight",
              typeof value === "string" && value.length > 10 ? "text-base" : "text-xl"
            )}>
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