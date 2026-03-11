import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const stats = { total: 0, compliant: 0, nonCompliant: 0, criticalAlerts: 0 };

const complianceData: { name: string; value: number; fill: string }[] = [];
const osData: { name: string; value: number; fill: string }[] = [];
const recentAlerts: { id: number; endpoint: string; type: string; severity: string; time: string }[] = [];

export default function EndpointSecurityDashboard() {
  const statCards = [
    { label: "Total Endpoints", value: stats.total, icon: Shield, color: "text-primary" },
    { label: "Compliant", value: stats.compliant, icon: ShieldCheck, color: "text-chart-3" },
    { label: "Non-Compliant", value: stats.nonCompliant, icon: ShieldX, color: "text-destructive" },
    { label: "Critical Alerts", value: stats.criticalAlerts, icon: ShieldAlert, color: "text-chart-1" },
  ];

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-2.5 flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg bg-muted ${s.color}`}><s.icon className="h-4 w-4" /></div>
              <div>
                <p className="text-lg font-bold leading-tight text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Compliance Status</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 flex items-center justify-center">
            {complianceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={complianceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {complianceData.map((_, i) => <Cell key={i} fill={complianceData[i].fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">OS Distribution</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 flex items-center justify-center">
            {osData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={osData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {osData.map((_, i) => <Cell key={i} fill={osData[i].fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Recent Alerts</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 space-y-1">
            {recentAlerts.length > 0 ? recentAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-2 py-1 border-b last:border-0">
                <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="text-[10px]">{a.severity}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{a.endpoint}</p>
                  <p className="text-[10px] text-muted-foreground">{a.type}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{a.time}</span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
