import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useOBStats } from "@/hooks/onboarding/useOnboardingData";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

export default function OnOffBoardingReports() {
  const { data: stats, isLoading } = useOBStats();

  if (isLoading) return <div className="p-3"><Skeleton className="h-64 w-full" /></div>;

  const all = stats?.allWorkflows ?? [];

  // Status breakdown for pie chart
  const statusCounts = [
    { name: "Active", value: all.filter(w => w.status === "active").length },
    { name: "Completed", value: all.filter(w => w.status === "completed").length },
    { name: "Cancelled", value: all.filter(w => w.status === "cancelled").length },
  ].filter(s => s.value > 0);

  // Type breakdown for pie chart
  const typeCounts = [
    { name: "Onboarding", value: all.filter(w => w.type === "onboarding").length },
    { name: "Offboarding", value: all.filter(w => w.type === "offboarding").length },
  ].filter(s => s.value > 0);

  // Monthly trend (last 6 months)
  const monthlyData: { month: string; onboarding: number; offboarding: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short" });
    monthlyData.push({
      month: label,
      onboarding: all.filter(w => w.type === "onboarding" && w.created_at.startsWith(key)).length,
      offboarding: all.filter(w => w.type === "offboarding" && w.created_at.startsWith(key)).length,
    });
  }

  const totalCompleted = all.filter(w => w.status === "completed").length;
  const completionRate = all.length > 0 ? Math.round((totalCompleted / all.length) * 100) : 0;

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Monthly Trend</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {monthlyData.some(m => m.onboarding + m.offboarding > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="onboarding" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Onboarding" />
                  <Bar dataKey="offboarding" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Offboarding" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">By Status</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 flex items-center justify-center">
            {statusCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusCounts} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
              { label: "Total Workflows", value: String(all.length) },
              { label: "Completion Rate", value: `${completionRate}%` },
              { label: "Onboarding Count", value: String(all.filter(w => w.type === "onboarding").length) },
              { label: "Offboarding Count", value: String(all.filter(w => w.type === "offboarding").length) },
            ].map(m => (
              <div key={m.label} className="flex justify-between items-center py-1 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{m.label}</span>
                <span className="text-sm font-semibold text-foreground">{m.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">By Type</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 flex items-center justify-center">
            {typeCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeCounts} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {typeCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
