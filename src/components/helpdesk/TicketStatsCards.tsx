import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Ticket, Clock, CheckCircle2, AlertTriangle, TrendingUp, AlertCircle } from "lucide-react";
import { useHelpdeskStats } from "@/hooks/useHelpdeskStats";

export const TicketStatsCards = () => {
  const { data: stats, isLoading } = useHelpdeskStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Tickets",
      value: stats?.total || 0,
      icon: Ticket,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Open",
      value: stats?.open || 0,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "In Progress",
      value: stats?.inProgress || 0,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Resolved",
      value: stats?.resolved || 0,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Urgent",
      value: stats?.urgent || 0,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "SLA Breached",
      value: stats?.slaBreached || 0,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-600/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
