import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useNavigate } from "react-router-dom";
import { useITTasks, useITTaskActivity } from "@/hooks/it-tasks/useITTasks";
import { format } from "date-fns";

const priorityColor: Record<string, string> = { critical: "destructive", high: "default", medium: "secondary", low: "outline" };

export default function ITTasksDashboard() {
  const { data: tasks = [] } = useITTasks();
  const { data: activity = [] } = useITTaskActivity();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const today = new Date(now.toDateString());

    const total = tasks.length;
    const open = tasks.filter(t => t.status !== "done").length;
    const overdue = tasks.filter(t => t.due_date && t.status !== "done" && new Date(t.due_date) < today).length;
    const completedThisWeek = tasks.filter(t => t.status === "done" && new Date(t.updated_at) >= weekAgo).length;

    return [
      { label: "Total Tasks", value: total, icon: ClipboardList, color: "text-primary" },
      { label: "Open", value: open, icon: Clock, color: "text-chart-1" },
      { label: "Overdue", value: overdue, icon: AlertTriangle, color: "text-destructive" },
      { label: "Completed This Week", value: completedThisWeek, icon: CheckCircle, color: "text-chart-3" },
    ];
  }, [tasks]);

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach(t => { counts[t.priority] = (counts[t.priority] || 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, count]) => ({ name, count, fill: `hsl(var(--chart-${name === "critical" ? 1 : name === "high" ? 2 : name === "medium" ? 3 : 4}))` }));
  }, [tasks]);

  const upcomingDeadlines = useMemo(() => {
    const today = new Date(new Date().toDateString());
    return tasks
      .filter(t => t.due_date && t.status !== "done" && new Date(t.due_date) >= today)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5)
      .map(t => ({ id: t.id, title: t.title, due: t.due_date!, priority: t.priority }));
  }, [tasks]);

  const recentActivity = activity.slice(0, 8);

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {stats.map(s => (
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
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Tasks by Priority</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Upcoming Deadlines</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 space-y-1">
            {upcomingDeadlines.length > 0 ? upcomingDeadlines.map(d => (
              <div
                key={d.id}
                className="flex items-center justify-between py-1.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                onClick={() => navigate(`/it-tasks/${d.id}`)}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{d.title}</p>
                  <p className="text-[11px] text-muted-foreground">Due: {d.due}</p>
                </div>
                <Badge variant={priorityColor[d.priority] as any}>{d.priority}</Badge>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming deadlines</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 space-y-1">
            {recentActivity.length > 0 ? recentActivity.map(a => (
              <div
                key={a.id}
                className={`flex items-center justify-between py-1.5 border-b last:border-0 ${a.task_id ? "cursor-pointer hover:bg-muted/50" : ""} rounded px-1 -mx-1 transition-colors`}
                onClick={() => a.task_id && navigate(`/it-tasks/${a.task_id}`)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] shrink-0">{a.action}</Badge>
                  <span className="text-sm text-foreground truncate">{a.task_title}</span>
                  {a.detail && <span className="text-[11px] text-muted-foreground truncate">{a.detail}</span>}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                  {format(new Date(a.created_at), "MMM d, HH:mm")}
                </span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
