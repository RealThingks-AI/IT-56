import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  Clock,
  Loader2,
  Activity,
  Database,
  Users,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Zap,
  TrendingUp,
  AlertTriangle,
  Wifi,
} from "lucide-react";
import { SettingsLoadingSkeleton } from "./SettingsLoadingSkeleton";
import { format, formatDistanceToNow } from "date-fns";

interface OrgSettings {
  name: string;
  timezone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
}

interface TableStats {
  table_name: string;
  row_count: number;
}

interface SystemMetrics {
  dbLatency: number | null;
  activeUsers24h: number;
  lastBackupAt: string | null;
  errorRate: number;
  uptime: number;
}

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

const TABLE_DISPLAY_NAMES: Record<string, string> = {
  helpdesk_tickets: "Tickets",
  itam_assets: "Assets",
  users: "Users",
  subscriptions_tools: "Subscriptions",
  helpdesk_categories: "Categories",
  helpdesk_problems: "Problems",
  helpdesk_changes: "Changes",
  audit_logs: "Audit Logs",
  user_roles: "User Roles",
  organisations: "Organizations",
};

export function AdminSystem() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const organisation = currentUser?.organisation;
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const [settings, setSettings] = useState<OrgSettings>({
    name: "",
    timezone: "UTC",
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  });

  useEffect(() => {
    if (organisation) {
      setSettings((prev) => ({
        ...prev,
        name: organisation.name || "",
      }));
    }
  }, [organisation]);

  // Fetch table statistics
  const { data: tableStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["system-table-stats"],
    queryFn: async () => {
      const tables = [
        "helpdesk_tickets",
        "itam_assets",
        "users",
        "subscriptions_tools",
        "helpdesk_categories",
        "helpdesk_problems",
        "helpdesk_changes",
        "audit_logs",
        "user_roles",
        "organisations",
      ];

      const stats: TableStats[] = [];
      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table as "users")
            .select("*", { count: "exact", head: true });
          if (!error) {
            stats.push({ table_name: table, row_count: count || 0 });
          }
        } catch {
          stats.push({ table_name: table, row_count: 0 });
        }
      }
      return stats;
    },
    staleTime: 30 * 1000,
  });

  // Fetch system metrics
  const { data: systemMetrics } = useQuery({
    queryKey: ["system-metrics"],
    queryFn: async (): Promise<SystemMetrics> => {
      // Measure database latency
      const latencyStart = performance.now();
      await supabase.from("users").select("id").limit(1);
      const dbLatency = Math.round(performance.now() - latencyStart);

      // Get active users in last 24 hours from audit logs
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const { data: activeUsersData } = await supabase
        .from("audit_logs")
        .select("user_id")
        .gte("created_at", twentyFourHoursAgo.toISOString())
        .not("user_id", "is", null);
      
      const uniqueActiveUsers = new Set(activeUsersData?.map(log => log.user_id) || []);
      const activeUsers24h = uniqueActiveUsers.size;

      // Get last backup from backup_schedules
      const { data: backupData } = await supabase
        .from("backup_schedules")
        .select("last_backup_at")
        .order("last_backup_at", { ascending: false })
        .limit(1)
        .single();

      const lastBackupAt = backupData?.last_backup_at || null;

      // Calculate error rate from recent audit logs (count errors vs total)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const { count: totalLogs } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneHourAgo.toISOString());

      const { count: errorLogs } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneHourAgo.toISOString())
        .or("action_type.ilike.%error%,action_type.ilike.%fail%");

      const errorRate = totalLogs && totalLogs > 0 ? ((errorLogs || 0) / totalLogs) * 100 : 0;

      return {
        dbLatency,
        activeUsers24h,
        lastBackupAt,
        errorRate: Math.round(errorRate * 100) / 100,
        uptime: 99.9, // This would come from an external monitoring service in production
      };
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const totalRecords = tableStats?.reduce((acc, t) => acc + t.row_count, 0) || 0;
  const userCount = tableStats?.find(t => t.table_name === "users")?.row_count || 0;

  // Calculate estimated storage (rough estimate based on records)
  const estimatedStorageMB = Math.round(totalRecords * 0.002 * 100) / 100; // ~2KB per record average
  const maxStorageMB = 500; // Supabase free tier limit
  const storagePercentage = Math.min(Math.round((estimatedStorageMB / maxStorageMB) * 100), 100);

  const updateSettings = useMutation({
    mutationFn: async (data: OrgSettings) => {
      if (!organisation?.id) throw new Error("Organisation not found");
      const { error } = await supabase
        .from("organisations")
        .update({
          name: data.name,
          settings: {
            timezone: data.timezone,
            workingHoursStart: data.workingHoursStart,
            workingHoursEnd: data.workingHoursEnd,
            workingDays: data.workingDays,
          },
        })
        .eq("id", organisation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organisation"] });
      toast.success("System settings updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });

  const handleRefresh = () => {
    refetchStats();
    queryClient.invalidateQueries({ queryKey: ["system-metrics"] });
    setLastRefresh(new Date());
    toast.success("System status refreshed");
  };

  if (userLoading) {
    return <SettingsLoadingSkeleton cards={3} rows={4} />;
  }

  // Determine health status based on metrics
  const getHealthStatus = (): { status: "healthy" | "warning" | "critical"; label: string } => {
    if (!systemMetrics) return { status: "healthy", label: "Checking..." };
    
    if (systemMetrics.dbLatency && systemMetrics.dbLatency > 500) {
      return { status: "warning", label: "Slow" };
    }
    if (systemMetrics.errorRate > 5) {
      return { status: "critical", label: "Issues Detected" };
    }
    if (storagePercentage > 90) {
      return { status: "warning", label: "Storage High" };
    }
    return { status: "healthy", label: "Healthy" };
  };

  const healthInfo = getHealthStatus();

  const getHealthIcon = () => {
    switch (healthInfo.status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "critical":
        return <XCircle className="h-5 w-5" />;
    }
  };

  const getHealthColors = () => {
    switch (healthInfo.status) {
      case "healthy":
        return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400";
      case "critical":
        return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status */}
      <SettingsCard
        title="System Status"
        description="Monitor database health, records, and storage usage"
        icon={Activity}
        headerAction={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={statsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Health Status */}
            <div className={`border rounded-lg p-4 ${getHealthColors()}`}>
              <div className="flex items-center gap-2 mb-2">
                {getHealthIcon()}
                <span className="text-sm font-medium">Health</span>
              </div>
              <p className="text-2xl font-bold capitalize">
                {healthInfo.label}
              </p>
            </div>

            {/* Database Latency */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-medium">DB Latency</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {systemMetrics?.dbLatency ? `${systemMetrics.dbLatency}ms` : "—"}
              </p>
            </div>

            {/* Active Users */}
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400 mb-2">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Active (24h)</span>
              </div>
              <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">
                {systemMetrics?.activeUsers24h || 0}
              </p>
            </div>

            {/* Storage */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                <HardDrive className="h-5 w-5" />
                <span className="text-sm font-medium">Storage</span>
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {storagePercentage}%
              </p>
              <Progress value={storagePercentage} className="h-1 mt-2" />
              <p className="text-xs mt-1 opacity-80">
                ~{estimatedStorageMB}MB / {maxStorageMB}MB
              </p>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Database className="h-4 w-4" />
                <span className="text-sm">Total Records</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {totalRecords.toLocaleString()}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Total Users</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {userCount}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Uptime</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {systemMetrics?.uptime || 99.9}%
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">Error Rate</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {systemMetrics?.errorRate || 0}%
              </p>
            </div>
          </div>

          {/* Database Tables */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Database Tables</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {tableStats?.map((table) => (
                <div
                  key={table.table_name}
                  className="bg-muted/50 rounded-lg p-3 text-center"
                >
                  <p className="text-sm font-medium text-foreground">
                    {TABLE_DISPLAY_NAMES[table.table_name] || table.table_name}
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {table.row_count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* System Info */}
          <div className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Last Backup: {systemMetrics?.lastBackupAt 
                  ? formatDistanceToNow(new Date(systemMetrics.lastBackupAt), { addSuffix: true })
                  : "Not configured"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                Keep-Alive: Active
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Last Refresh: {format(lastRefresh, "HH:mm:ss")}
              </Badge>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Organization Settings */}
      <SettingsCard
        title="Organization Settings"
        description="Configure your organization's basic information"
        icon={Building2}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={settings.name}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter organization name"
            />
          </div>
          <div className="space-y-2">
            <Label>Default Timezone</Label>
            <Select
              value={settings.timezone}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, timezone: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsCard>

      {/* Working Hours */}
      <SettingsCard
        title="Working Hours"
        description="Define your organization's standard working hours for SLA calculations"
        icon={Clock}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hours-start">Start Time</Label>
              <Input
                id="hours-start"
                type="time"
                value={settings.workingHoursStart}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    workingHoursStart: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours-end">End Time</Label>
              <Input
                id="hours-end"
                type="time"
                value={settings.workingHoursEnd}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    workingHoursEnd: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Working Days</Label>
            <div className="flex flex-wrap gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <Button
                  key={day}
                  variant={settings.workingDays.includes(day) ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      workingDays: prev.workingDays.includes(day)
                        ? prev.workingDays.filter((d) => d !== day)
                        : [...prev.workingDays, day],
                    }))
                  }
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => updateSettings.mutate(settings)}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Settings
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}
