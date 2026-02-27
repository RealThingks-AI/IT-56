import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertTriangle,
  Wifi,
  Server,
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
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "CET" },
  { value: "Asia/Tokyo", label: "JST" },
  { value: "Asia/Kolkata", label: "IST" },
  { value: "Australia/Sydney", label: "AET" },
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
  tenants: "Tenants",
};

export function AdminSystem() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const companyName = "RT-IT-Hub";
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
    setSettings((prev) => ({ ...prev, name: companyName }));
  }, []);

  const { data: tableStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["system-table-stats"],
    queryFn: async () => {
      const tables = Object.keys(TABLE_DISPLAY_NAMES);
      const stats: TableStats[] = [];
      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table as any)
            .select("*", { count: "exact", head: true });
          if (!error) stats.push({ table_name: table, row_count: count || 0 });
        } catch {
          stats.push({ table_name: table, row_count: 0 });
        }
      }
      return stats;
    },
    staleTime: 30 * 1000,
  });

  const { data: systemMetrics } = useQuery({
    queryKey: ["system-metrics"],
    queryFn: async (): Promise<SystemMetrics> => {
      const latencyStart = performance.now();
      await supabase.from("users").select("id").limit(1);
      const dbLatency = Math.round(performance.now() - latencyStart);

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: activeUsersData } = await supabase
        .from("audit_logs")
        .select("user_id")
        .gte("created_at", twentyFourHoursAgo.toISOString())
        .not("user_id", "is", null);

      const uniqueActiveUsers = new Set(activeUsersData?.map((log) => log.user_id) || []);

      const { data: backupData } = await supabase
        .from("backup_schedules")
        .select("last_backup_at")
        .order("last_backup_at", { ascending: false })
        .limit(1)
        .single();

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
        activeUsers24h: uniqueActiveUsers.size,
        lastBackupAt: backupData?.last_backup_at || null,
        errorRate: Math.round(errorRate * 100) / 100,
        uptime: 99.9,
      };
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const totalRecords = tableStats?.reduce((acc, t) => acc + t.row_count, 0) || 0;
  const userCount = tableStats?.find((t) => t.table_name === "users")?.row_count || 0;
  const estimatedStorageMB = Math.round(totalRecords * 0.002 * 100) / 100;
  const maxStorageMB = 500;
  const storagePercentage = Math.min(Math.round((estimatedStorageMB / maxStorageMB) * 100), 100);

  const updateSettings = useMutation({
    mutationFn: async (data: OrgSettings) => {
      const { data: existing } = await supabase
        .from("itam_company_info")
        .select("id")
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("itam_company_info")
          .update({ company_name: data.name })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("itam_company_info")
          .insert({ company_name: data.name });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itam-company-info"] });
      toast.success("Settings saved");
    },
    onError: (error: Error) => {
      toast.error("Failed: " + error.message);
    },
  });

  const handleRefresh = () => {
    refetchStats();
    queryClient.invalidateQueries({ queryKey: ["system-metrics"] });
    setLastRefresh(new Date());
  };

  if (userLoading) {
    return <SettingsLoadingSkeleton cards={2} rows={4} />;
  }

  const getHealthStatus = () => {
    if (!systemMetrics) return { status: "healthy" as const, label: "Checking..." };
    if (systemMetrics.dbLatency && systemMetrics.dbLatency > 500) return { status: "warning" as const, label: "Slow" };
    if (systemMetrics.errorRate > 5) return { status: "critical" as const, label: "Issues" };
    if (storagePercentage > 90) return { status: "warning" as const, label: "Storage High" };
    return { status: "healthy" as const, label: "Healthy" };
  };

  const health = getHealthStatus();

  const healthColors = {
    healthy: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    critical: "text-red-600 dark:text-red-400",
  };

  const HealthIcon = health.status === "healthy" ? CheckCircle2 : health.status === "warning" ? AlertTriangle : XCircle;

  // Metric items for the top row
  const metrics = [
    {
      icon: HealthIcon,
      label: "Health",
      value: health.label,
      colorClass: healthColors[health.status],
    },
    {
      icon: Zap,
      label: "Latency",
      value: systemMetrics?.dbLatency ? `${systemMetrics.dbLatency}ms` : "—",
      colorClass: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: Users,
      label: "Active (24h)",
      value: String(systemMetrics?.activeUsers24h || 0),
      colorClass: "text-violet-600 dark:text-violet-400",
    },
    {
      icon: Database,
      label: "Records",
      value: totalRecords.toLocaleString(),
      colorClass: "text-foreground",
    },
    {
      icon: Users,
      label: "Users",
      value: String(userCount),
      colorClass: "text-foreground",
    },
    {
      icon: Wifi,
      label: "Error Rate",
      value: `${systemMetrics?.errorRate || 0}%`,
      colorClass: systemMetrics?.errorRate && systemMetrics.errorRate > 0 ? "text-red-600 dark:text-red-400" : "text-foreground",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Section 1: System Health */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">System Health</h3>
            <span className="text-[10px] text-muted-foreground">
              Last: {format(lastRefresh, "HH:mm:ss")}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRefresh} disabled={statsLoading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${statsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border bg-card p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <m.icon className={`h-3 w-3 ${m.colorClass}`} />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
              <p className={`text-sm font-bold ${m.colorClass}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Storage bar */}
        <div className="mt-2 rounded-lg border bg-card p-2.5 flex items-center gap-3">
          <HardDrive className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Storage</span>
              <span className="text-[10px] text-muted-foreground">~{estimatedStorageMB}MB / {maxStorageMB}MB</span>
            </div>
            <Progress value={storagePercentage} className="h-1.5" />
          </div>
          <span className="text-xs font-semibold w-8 text-right">{storagePercentage}%</span>
        </div>

        {/* Info badges */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {systemMetrics?.lastBackupAt && (
            <Badge variant="outline" className="text-[10px] font-normal">
              Backup: {formatDistanceToNow(new Date(systemMetrics.lastBackupAt), { addSuffix: true })}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] font-normal bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
            Keep-Alive: Active
          </Badge>
        </div>
      </div>

      {/* Section 2: Database Tables */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Database Tables</h3>
          <Badge variant="outline" className="text-[10px] font-normal">{tableStats?.length || 0} tables</Badge>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Table</TableHead>
                <TableHead className="text-xs text-right w-[100px]">Records</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableStats?.map((table) => (
                <TableRow key={table.table_name} className="h-8">
                  <TableCell className="text-xs py-1 font-medium">
                    {TABLE_DISPLAY_NAMES[table.table_name] || table.table_name}
                  </TableCell>
                  <TableCell className="text-xs py-1 text-right tabular-nums font-semibold text-primary">
                    {table.row_count.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 3: Company & Working Hours */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Company & Working Hours</h3>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-4">
          {/* Company Name + Timezone row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Company Name</Label>
              <Input
                value={settings.name}
                onChange={(e) => setSettings((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Company name"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Working Hours row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Start Time</Label>
              <Input
                type="time"
                value={settings.workingHoursStart}
                onChange={(e) => setSettings((prev) => ({ ...prev, workingHoursStart: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Time</Label>
              <Input
                type="time"
                value={settings.workingHoursEnd}
                onChange={(e) => setSettings((prev) => ({ ...prev, workingHoursEnd: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Working Days */}
          <div className="space-y-1">
            <Label className="text-xs">Working Days</Label>
            <div className="flex flex-wrap gap-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <Button
                  key={day}
                  variant={settings.workingDays.includes(day) ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-3"
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

          {/* Save */}
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => updateSettings.mutate(settings)}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
