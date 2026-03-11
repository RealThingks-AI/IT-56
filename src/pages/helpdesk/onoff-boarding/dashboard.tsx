import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck, UserMinus, CheckCircle, Clock } from "lucide-react";
import { useOBStats } from "@/hooks/onboarding/useOnboardingData";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function OnOffBoardingDashboard() {
  const { data: stats, isLoading } = useOBStats();
  const navigate = useNavigate();

  if (isLoading) return <div className="p-3 space-y-2"><div className="grid grid-cols-4 gap-2.5">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div><Skeleton className="h-48" /></div>;

  const statCards = [
    { label: "Active Onboardings", value: stats?.activeOnboarding ?? 0, icon: UserCheck, color: "text-chart-3" },
    { label: "Active Offboardings", value: stats?.activeOffboarding ?? 0, icon: UserMinus, color: "text-chart-1" },
    { label: "Completed This Month", value: stats?.completedThisMonth ?? 0, icon: CheckCircle, color: "text-primary" },
    { label: "Total Workflows", value: stats?.allWorkflows?.length ?? 0, icon: Clock, color: "text-muted-foreground" },
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
          <CardContent className="p-3">
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
            {(stats?.recentWorkflows?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {stats!.recentWorkflows.map((w: any) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 py-1.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                    onClick={() => navigate(`/onoff-boarding/workflow-detail/${w.id}`)}
                  >
                    <Badge variant={w.type === "onboarding" ? "default" : "secondary"} className="text-[10px]">{w.type}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{w.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{w.department || "No dept"}</p>
                    </div>
                    <Badge variant={w.status === "completed" ? "default" : w.status === "active" ? "secondary" : "outline"} className="text-[10px]">{w.status}</Badge>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{format(new Date(w.created_at), "MMM d")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming</h3>
            {(stats?.upcomingWorkflows?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {stats!.upcomingWorkflows.map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                    onClick={() => navigate(`/onoff-boarding/workflow-detail/${u.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{u.department || "No dept"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={u.type === "onboarding" ? "default" : "secondary"}>{u.type}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{u.start_date || u.last_day || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming workflows</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
