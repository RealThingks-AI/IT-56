import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const stats = { total: 0, online: 0, offline: 0, warning: 0 };

const devices: { id: number; name: string; status: string }[] = [];

const statusColor: Record<string, string> = { online: "bg-chart-3", offline: "bg-destructive", warning: "bg-chart-2" };

const responseData: { time: string; ms: number }[] = [];

const alerts: { id: number; device: string; message: string; severity: string }[] = [];

export default function NetworkDashboard() {
  const navigate = useNavigate();
  const statCards = [
    { label: "Total Devices", value: stats.total, icon: Server, color: "text-primary" },
    { label: "Online", value: stats.online, icon: Wifi, color: "text-chart-3" },
    { label: "Offline", value: stats.offline, icon: WifiOff, color: "text-destructive" },
    { label: "Warning", value: stats.warning, icon: AlertTriangle, color: "text-chart-2" },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Live Status Grid</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {devices.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {devices.map(d => (
                  <div
                    key={d.id}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/network-monitoring/device-detail/${d.id}`)}
                  >
                    <div className={`h-2.5 w-2.5 rounded-full ${statusColor[d.status]}`} />
                    <span className="text-[9px] text-foreground font-medium text-center leading-tight">{d.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No devices added yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Response Time Trend</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {responseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={responseData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="ms" />
                  <Tooltip />
                  <Line type="monotone" dataKey="ms" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Active Alerts</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-1">
          {alerts.length > 0 ? alerts.map(a => (
            <div key={a.id} className="flex items-center gap-2.5 py-1.5 border-b last:border-0">
              <Badge variant={a.severity === "critical" ? "destructive" : "secondary"}>{a.severity}</Badge>
              <span className="text-sm font-medium text-foreground">{a.device}</span>
              <span className="text-xs text-muted-foreground flex-1">{a.message}</span>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-4">No active alerts</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
