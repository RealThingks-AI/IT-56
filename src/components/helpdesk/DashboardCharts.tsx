import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

import { CHART_STATUS_COLORS, CHART_PRIORITY_COLORS } from "@/lib/statusConfig";

const PRIORITY_COLORS = CHART_PRIORITY_COLORS;

const STATUS_COLORS = CHART_STATUS_COLORS;

export function DashboardCharts() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["dashboard-charts"],
    staleTime: 5 * 60 * 1000,  // 5 minutes - charts don't need real-time updates
    gcTime: 10 * 60 * 1000,    // 10 minutes cache retention
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data: tickets, error } = await supabase
        .from("helpdesk_tickets")
        .select("id, status, priority, created_at, resolved_at, first_response_at, sla_breached")
        .eq("is_deleted", false)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Generate daily trend data
      const days = eachDayOfInterval({
        start: thirtyDaysAgo,
        end: new Date(),
      });

      const dailyData = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const created = tickets?.filter(
          (t) =>
            new Date(t.created_at) >= dayStart &&
            new Date(t.created_at) < dayEnd
        ).length || 0;

        const resolved = tickets?.filter(
          (t) =>
            t.resolved_at &&
            new Date(t.resolved_at) >= dayStart &&
            new Date(t.resolved_at) < dayEnd
        ).length || 0;

        return {
          date: format(day, "MMM dd"),
          created,
          resolved,
        };
      });

      // Priority distribution
      const priorityData = [
        { name: "Urgent", value: tickets?.filter((t) => t.priority === "urgent").length || 0, color: PRIORITY_COLORS.urgent },
        { name: "High", value: tickets?.filter((t) => t.priority === "high").length || 0, color: PRIORITY_COLORS.high },
        { name: "Medium", value: tickets?.filter((t) => t.priority === "medium").length || 0, color: PRIORITY_COLORS.medium },
        { name: "Low", value: tickets?.filter((t) => t.priority === "low").length || 0, color: PRIORITY_COLORS.low },
      ].filter((d) => d.value > 0);

      // Status distribution
      const statusData = [
        { name: "Open", value: tickets?.filter((t) => t.status === "open").length || 0, color: STATUS_COLORS.open },
        { name: "In Progress", value: tickets?.filter((t) => t.status === "in_progress").length || 0, color: STATUS_COLORS.in_progress },
        { name: "On Hold", value: tickets?.filter((t) => t.status === "on_hold").length || 0, color: STATUS_COLORS.on_hold },
        { name: "Resolved", value: tickets?.filter((t) => t.status === "resolved").length || 0, color: STATUS_COLORS.resolved },
        { name: "Closed", value: tickets?.filter((t) => t.status === "closed").length || 0, color: STATUS_COLORS.closed },
      ].filter((d) => d.value > 0);

      // Calculate KPIs
      const resolvedTickets = tickets?.filter((t) => t.resolved_at) || [];
      const avgResolutionTime = resolvedTickets.length > 0
        ? resolvedTickets.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const resolved = new Date(t.resolved_at!).getTime();
            return acc + (resolved - created);
          }, 0) / resolvedTickets.length / (1000 * 60 * 60)
        : 0;

      const respondedTickets = tickets?.filter((t) => t.first_response_at) || [];
      const avgFirstResponse = respondedTickets.length > 0
        ? respondedTickets.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const responded = new Date(t.first_response_at!).getTime();
            return acc + (responded - created);
          }, 0) / respondedTickets.length / (1000 * 60 * 60)
        : 0;

      const slaCompliance = tickets && tickets.length > 0
        ? Math.round(((tickets.length - (tickets.filter((t) => t.sla_breached).length || 0)) / tickets.length) * 100)
        : 100;

      const resolutionRate = tickets && tickets.length > 0
        ? Math.round((resolvedTickets.length / tickets.length) * 100)
        : 0;

      return {
        dailyData,
        priorityData,
        statusData,
        kpis: {
          avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
          avgFirstResponse: Math.round(avgFirstResponse * 10) / 10,
          slaCompliance,
          resolutionRate,
          totalTickets: tickets?.length || 0,
        },
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* KPI Cards Skeleton - matches exact structure */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Charts Skeleton - matches exact structure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full bg-muted/50 rounded-md" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full bg-muted/50 rounded-md" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full bg-muted/50 rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="min-h-[76px]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary min-h-[32px]">
              {chartData?.kpis.avgResolutionTime || 0}h
            </div>
            <p className="text-xs text-muted-foreground min-h-[16px]">Avg Resolution Time (MTTR)</p>
          </CardContent>
        </Card>
        <Card className="min-h-[76px]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary min-h-[32px]">
              {chartData?.kpis.avgFirstResponse || 0}h
            </div>
            <p className="text-xs text-muted-foreground min-h-[16px]">Avg First Response</p>
          </CardContent>
        </Card>
        <Card className="min-h-[76px]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary min-h-[32px]">
              {chartData?.kpis.slaCompliance || 0}%
            </div>
            <p className="text-xs text-muted-foreground min-h-[16px]">SLA Compliance</p>
          </CardContent>
        </Card>
        <Card className="min-h-[76px]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary min-h-[32px]">
              {chartData?.kpis.resolutionRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground min-h-[16px]">Resolution Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ticket Volume (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData?.dailyData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Created"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData?.priorityData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {chartData?.priorityData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData?.statusData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData?.statusData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
