import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Package, AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { useHelpdeskStats } from "@/hooks/useHelpdeskStats";
import { useITAMStats } from "@/hooks/useITAMStats";
import { DashboardStatCard } from "@/components/helpdesk/DashboardStatCard";
import { RecentTicketsList } from "@/components/helpdesk/RecentTicketsList";
import { SystemHealthMetrics } from "@/components/helpdesk/SystemHealthMetrics";
import { DashboardCharts } from "@/components/helpdesk/DashboardCharts";

export default function HelpdeskDashboard() {
  const { data: ticketStats } = useHelpdeskStats();
  const { data: assetStats } = useITAMStats();

  return (
    <div className="max-w-7xl space-y-6 min-h-[calc(100vh-4rem)]">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <DashboardStatCard
          title="Total Tickets"
          value={ticketStats?.total || 0}
          icon={Ticket}
          color="text-blue-500"
          href="/tickets"
          subtitle={`${ticketStats?.recentTickets || 0} new this week`}
        />
        <DashboardStatCard
          title="Open"
          value={ticketStats?.open || 0}
          icon={AlertCircle}
          color="text-orange-500"
          href="/tickets?status=open"
          subtitle={ticketStats?.slaBreached ? `${ticketStats.slaBreached} SLA breached` : "On track"}
        />
        <DashboardStatCard
          title="In Progress"
          value={ticketStats?.inProgress || 0}
          icon={Clock}
          color="text-purple-500"
          href="/tickets?status=in_progress"
        />
        <DashboardStatCard
          title="Resolved"
          value={ticketStats?.resolved || 0}
          icon={CheckCircle2}
          color="text-green-500"
          href="/tickets?status=resolved"
        />
        <DashboardStatCard
          title="Assets"
          value={assetStats?.totalAssets || 0}
          icon={Package}
          color="text-cyan-500"
          href="/assets"
          subtitle={`${assetStats?.assigned || 0} assigned`}
        />
        <DashboardStatCard
          title="SLA Compliance"
          value={`${ticketStats?.slaCompliance || 100}%`}
          icon={TrendingUp}
          color="text-emerald-500"
          href="/sla"
          subtitle={`MTTR: ${ticketStats?.mttr || 0}h`}
        />
      </div>

      {/* Charts Section */}
      <DashboardCharts />

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTicketsList />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <SystemHealthMetrics />
          </CardContent>
        </Card>
      </div>

      {/* ITAM Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="min-h-[100px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold min-h-[32px]">
              {assetStats?.totalAssets || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 min-h-[16px]">Across all types</p>
          </CardContent>
        </Card>

        <Card className="min-h-[100px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laptops</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold min-h-[32px]">
              {assetStats?.laptops || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 min-h-[16px]">In inventory</p>
          </CardContent>
        </Card>

        <Card className="min-h-[100px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold min-h-[32px]">
              {assetStats?.assigned || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 min-h-[16px]">To employees</p>
          </CardContent>
        </Card>

        <Card className="min-h-[100px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licenses</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold min-h-[32px]">
              {assetStats?.licenses || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 min-h-[16px]">Active licenses</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
