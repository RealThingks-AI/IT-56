import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const complianceTrend: { month: string; pct: number }[] = [];
const alertBreakdown: { name: string; value: number; fill: string }[] = [];

export default function SecurityReports() {
  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Compliance Trend</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {complianceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={complianceTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[70, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pct" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Alert Breakdown by Type</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 flex items-center justify-center">
            {alertBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={alertBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {alertBreakdown.map((_, i) => <Cell key={i} fill={alertBreakdown[i].fill} />)}
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
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Key Metrics</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {[
              { label: "Overall Compliance", value: "—" },
              { label: "Endpoints Scanned (7d)", value: "0" },
              { label: "Critical Findings", value: "0" },
              { label: "Avg Patch Age", value: "—" },
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
