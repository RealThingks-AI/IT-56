import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Server,
  Shield,
  List,
  FileText,
  Plus,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalDevices: number;
  compliantDevices: number;
  nonCompliantDevices: number;
  offlineDevices: number;
  pendingUpdates: number;
  activeAlerts: number;
}

export default function SystemUpdatesDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalDevices: 0,
    compliantDevices: 0,
    nonCompliantDevices: 0,
    offlineDevices: 0,
    pendingUpdates: 0,
    activeAlerts: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch devices using actual schema
      // @ts-ignore - Bypass deep type inference issue
      const { data: devices } = await supabase
        .from("system_devices")
        .select("*")
        .eq("is_active", true);

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const totalDevices = devices?.length || 0;
      const compliantDevices =
        devices?.filter((d: any) => d.update_compliance_status === "compliant").length || 0;
      const nonCompliantDevices =
        devices?.filter((d: any) => d.update_compliance_status === "non_compliant").length || 0;
      const offlineDevices =
        devices?.filter((d: any) => !d.last_seen || new Date(d.last_seen) < sevenDaysAgo).length || 0;

      const pendingUpdates =
        devices?.reduce((sum: number, d: any) => sum + (d.pending_updates_count || 0), 0) || 0;

      // Fetch active alerts
      // @ts-ignore - Bypass deep type inference issue
      const { data: alerts } = await supabase
        .from("system_update_alerts")
        .select("id")
        .eq("is_resolved", false);

      const activeAlerts = alerts?.length || 0;

      setStats({
        totalDevices,
        compliantDevices,
        nonCompliantDevices,
        offlineDevices,
        pendingUpdates,
        activeAlerts,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const complianceData = [
    { name: "Compliant", value: stats.compliantDevices, fill: "hsl(var(--primary))" },
    { name: "Non-Compliant", value: stats.nonCompliantDevices, fill: "hsl(var(--destructive))" },
    { name: "Offline", value: stats.offlineDevices, fill: "hsl(var(--muted))" },
  ];

  const complianceRate =
    stats.totalDevices > 0
      ? Math.round((stats.compliantDevices / stats.totalDevices) * 100)
      : 0;

  return (
    <div className="p-4 space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/system-updates/devices")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Server className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{stats.totalDevices}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Devices</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/system-updates/devices?filter=compliant")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{complianceRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Compliance Rate</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/system-updates/devices?filter=pending")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold">{stats.pendingUpdates}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pending Updates</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{stats.activeAlerts}</span>
            </div>
            <p className="text-xs text-muted-foreground">Active Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Compliance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={complianceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/system-updates/devices")}>
          <CardContent className="p-4">
            <Server className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-sm mb-1">View All Devices</h3>
            <p className="text-xs text-muted-foreground">Manage device inventory and compliance status</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/system-updates/updates")}>
          <CardContent className="p-4">
            <List className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-sm mb-1">Browse Updates</h3>
            <p className="text-xs text-muted-foreground">View available KB updates and patch information</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/system-updates/settings")}>
          <CardContent className="p-4">
            <FileText className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-sm mb-1">Settings</h3>
            <p className="text-xs text-muted-foreground">Configure update policies and alerts</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
