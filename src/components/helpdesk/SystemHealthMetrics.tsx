import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { useHelpdeskStats } from "@/hooks/useHelpdeskStats";
import { useITAMStats } from "@/hooks/useITAMStats";
import { Loader2 } from "lucide-react";

export function SystemHealthMetrics() {
  const { data: ticketStats, isLoading: ticketsLoading } = useHelpdeskStats();
  const { data: assetStats, isLoading: assetsLoading } = useITAMStats();

  if (ticketsLoading || assetsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metrics = [
    {
      label: "Ticket Resolution",
      value: ticketStats 
        ? `${((ticketStats.resolved / (ticketStats.total || 1)) * 100).toFixed(0)}%`
        : "0%",
      trend: ticketStats && ticketStats.resolved > ticketStats.open ? "up" : "down",
      description: `${ticketStats?.resolved || 0} resolved of ${ticketStats?.total || 0} total`
    },
    {
      label: "Asset Utilization",
      value: assetStats 
        ? `${((assetStats.assigned / (assetStats.totalAssets || 1)) * 100).toFixed(0)}%`
        : "0%",
      trend: assetStats && assetStats.assigned > assetStats.totalAssets * 0.5 ? "up" : "stable",
      description: `${assetStats?.assigned || 0} assigned of ${assetStats?.totalAssets || 0} total`
    },
    {
      label: "SLA Compliance",
      value: ticketStats
        ? `${(((ticketStats.total - ticketStats.slaBreached) / (ticketStats.total || 1)) * 100).toFixed(0)}%`
        : "100%",
      trend: ticketStats && ticketStats.slaBreached > 0 ? "warning" : "up",
      description: ticketStats?.slaBreached ? `${ticketStats.slaBreached} breached` : "No breaches"
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {metrics.map((metric, index) => (
        <div key={index} className="flex items-center justify-between py-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{metric.label}</span>
              {getTrendIcon(metric.trend)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{metric.description}</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold">{metric.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
