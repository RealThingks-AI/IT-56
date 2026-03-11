import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useITTasks } from "@/hooks/it-tasks/useITTasks";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ITTasksReports() {
  const { data: tasks = [] } = useITTasks();

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, review: 0, done: 0 };
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, count]) => ({ name, count }));
  }, [tasks]);

  const assigneeData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      const assignee = t.assignee?.trim() || "Unassigned";
      counts[assignee] = (counts[assignee] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [tasks]);

  const metrics = useMemo(() => {
    const today = new Date(new Date().toDateString());
    const overdue = tasks.filter(t => t.due_date && t.status !== "done" && new Date(t.due_date) < today).length;
    const done = tasks.filter(t => t.status === "done").length;
    const total = tasks.length;
    const thisMonth = tasks.filter(t => {
      const d = new Date(t.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return [
      { label: "Completion Rate", value: total > 0 ? `${Math.round((done / total) * 100)}%` : "—" },
      { label: "Overdue Rate", value: total > 0 ? `${Math.round((overdue / total) * 100)}%` : "—" },
      { label: "Tasks Created This Month", value: String(thisMonth) },
      { label: "Total Completed", value: String(done) },
    ];
  }, [tasks]);

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Tasks by Status</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Tasks by Category</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Workload by Assignee</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {assigneeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={assigneeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Key Metrics</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {metrics.map(m => (
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
