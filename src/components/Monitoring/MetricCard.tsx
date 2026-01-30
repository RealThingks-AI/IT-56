import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LucideIcon, TrendingUp, TrendingDown, Minus, Settings } from "lucide-react";

export interface Metric {
  id: string;
  name: string;
  value: string | number;
  unit?: string;
  threshold?: number;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  trend?: 'up' | 'down' | 'stable';
  icon: LucideIcon;
  lastUpdated?: string;
}

interface MetricCardProps {
  metric: Metric;
  onConfigure?: (id: string) => void;
  onClick?: (id: string) => void;
}

export function MetricCard({ metric, onConfigure, onClick }: MetricCardProps) {
  const Icon = metric.icon;

  const getStatusColor = () => {
    switch (metric.status) {
      case 'healthy':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'critical':
        return 'text-destructive';
      case 'offline':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadge = () => {
    const config = {
      healthy: { label: 'Healthy', className: 'bg-success/10 text-success border-success/20' },
      warning: { label: 'Warning', className: 'bg-warning/10 text-warning border-warning/20' },
      critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive border-destructive/20' },
      offline: { label: 'Offline', className: 'bg-muted/10 text-muted-foreground border-muted/20' },
    };

    const statusConfig = config[metric.status];
    return <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>;
  };

  const getTrendIcon = () => {
    if (!metric.trend) return <Minus className="h-3 w-3" />;
    if (metric.trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (metric.trend === 'down') return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getProgressValue = () => {
    if (typeof metric.value === 'string') {
      const numMatch = metric.value.match(/(\d+)/);
      return numMatch ? parseInt(numMatch[1]) : 0;
    }
    return metric.value;
  };

  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onClick?.(metric.id)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${getStatusColor()}`} />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onConfigure?.(metric.id);
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">
              {metric.value}
              {metric.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{metric.unit}</span>}
            </div>
            {metric.trend && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getTrendIcon()}
              </div>
            )}
          </div>

          {typeof metric.value === 'number' || metric.value.toString().includes('%') ? (
            <Progress value={getProgressValue()} className="h-1.5" />
          ) : null}

          <div className="flex items-center justify-between">
            {getStatusBadge()}
            {metric.lastUpdated && (
              <span className="text-xs text-muted-foreground">
                {new Date(metric.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
