import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

const uptimeData: { device: string; uptime: number }[] = [];
const alertFrequency: { month: string; alerts: number }[] = [];

export default function NetworkReports() {
  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Monthly Uptime by Device</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {uptimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={uptimeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[80, 100]} unit="%" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="device" tick={{ fontSize: 9 }} width={75} />
                  <Tooltip />
                  <Bar dataKey="uptime" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Alert Frequency</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {alertFrequency.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={alertFrequency}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="alerts" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Key Metrics</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {[
              { label: "Overall Network Uptime", value: "—" },
              { label: "Avg Response Time", value: "—" },
              { label: "Active Alerts", value: "0" },
              { label: "Devices Monitored", value: "0" },
            ].map(m => (
              <div key={m.label} className="flex justify-between items-center py-1 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{m.label}</span>
                <span className="text-sm font-semibold text-foreground">{m.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
