import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Monitor, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Bell,
  XCircle
} from "lucide-react";
import { useUpdateStats } from "@/hooks/useUpdateManager";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "warning" | "error";
}

const StatCard = ({ title, value, icon, description, variant = "default" }: StatCardProps) => {
  const variantStyles = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
          <span className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}</span>
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

export const UpdateDashboard = () => {
  const { data: stats, isLoading } = useUpdateStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Monthly Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {stats?.compliantDevices || 0} of {stats?.totalDevices || 0} devices compliant
                </span>
                <span className="text-sm font-medium">{stats?.complianceRate || 0}%</span>
              </div>
              <Progress value={stats?.complianceRate || 0} className="h-3" />
            </div>
            <Badge 
              variant={
                (stats?.complianceRate || 0) >= 90 ? "default" : 
                (stats?.complianceRate || 0) >= 70 ? "secondary" : "destructive"
              }
              className="text-sm px-3 py-1"
            >
              {(stats?.complianceRate || 0) >= 90 ? "Excellent" : 
               (stats?.complianceRate || 0) >= 70 ? "Good" : "Needs Attention"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Devices"
          value={stats?.totalDevices || 0}
          icon={<Monitor className="h-4 w-4 text-primary" />}
          description="Active devices tracked"
        />
        <StatCard
          title="Compliant Devices"
          value={stats?.compliantDevices || 0}
          icon={<CheckCircle className="h-4 w-4 text-green-600" />}
          description="Up to date"
          variant="success"
        />
        <StatCard
          title="Pending Updates"
          value={stats?.pendingUpdates || 0}
          icon={<Clock className="h-4 w-4 text-yellow-600" />}
          description="Awaiting installation"
          variant={stats?.pendingUpdates ? "warning" : "default"}
        />
        <StatCard
          title="Failed Updates"
          value={stats?.failedUpdates || 0}
          icon={<XCircle className="h-4 w-4 text-red-600" />}
          description="Requires attention"
          variant={stats?.failedUpdates ? "error" : "default"}
        />
        <StatCard
          title="Unread Alerts"
          value={stats?.unreadAlerts || 0}
          icon={<Bell className="h-4 w-4 text-purple-600" />}
          description="New notifications"
          variant={stats?.unreadAlerts ? "warning" : "default"}
        />
      </div>

      {/* Quick Actions Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Install the device agent on machines to track update status automatically
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Review pending updates regularly to maintain compliance
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Failed updates may indicate connectivity or permission issues
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
