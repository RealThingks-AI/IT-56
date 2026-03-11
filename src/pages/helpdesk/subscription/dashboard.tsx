import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Calendar, Users, TrendingUp, Plus, DollarSign, ArrowRight, AlertTriangle, Building2, Key, Receipt } from "lucide-react";
import { AddToolDialog } from "@/components/Subscriptions/AddToolDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  formatCost, formatCostShort, getDaysUntilRenewal, getRenewalUrgency,
  getMonthlyEquivalentINR, getAnnualContributionINR, getStatusVariant,
  SUB_QUERY_KEYS,
} from "@/lib/subscriptions/subscriptionUtils";
import { convertToINR } from "@/lib/subscriptions/currencyConversion";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AssetStatCard } from "@/components/helpdesk/assets/AssetStatCard";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
  "hsl(var(--muted-foreground))",
];

export default function SubscriptionOverview() {
  const navigate = useNavigate();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: tools, isLoading } = useQuery({
    queryKey: [...SUB_QUERY_KEYS.toolsDashboard],
    staleTime: 30_000,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions_tools")
        .select("*, subscriptions_vendors(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: allLicenses } = useQuery({
    queryKey: [...SUB_QUERY_KEYS.licensesDashboard],
    staleTime: 30_000,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions_licenses")
        .select("id, tool_id, status");
      if (error) throw error;
      return data;
    },
  });

  const analytics = useMemo(() => {
    if (!tools) return null;
    const active = tools.filter(t => t.status === "active");
    const trial = tools.filter(t => t.status === "trial");
    const expired = tools.filter(t => t.status === "expired");
    const expiringSoon = tools.filter(t => t.status === "expiring_soon");

    const monthlyBurn = active.reduce((sum, t) => {
      return sum + getMonthlyEquivalentINR(Number(t.total_cost || 0), t.currency, t.subscription_type);
    }, 0);

    const annualCost = active.reduce((sum, t) => {
      return sum + getAnnualContributionINR(Number(t.total_cost || 0), t.currency, t.subscription_type, (t as any).purchase_date || t.created_at);
    }, 0);

    const renewals = tools
      .filter(t => {
        if (!t.renewal_date || t.status === "cancelled") return false;
        const days = getDaysUntilRenewal(t.renewal_date);
        return days !== null && days >= -7 && days <= 90;
      })
      .map(t => {
        const days = getDaysUntilRenewal(t.renewal_date)!;
        return {
          ...t,
          days_until: days,
          urgency: getRenewalUrgency(days, t.subscription_type),
          vendor_name: (t.subscriptions_vendors as any)?.name || "—",
        };
      })
      .sort((a, b) => a.days_until - b.days_until);

    const categoryMap = new Map<string, { count: number; total: number }>();
    active.forEach(t => {
      const cat = t.category || "Other";
      const cur = categoryMap.get(cat) || { count: 0, total: 0 };
      cur.count++;
      cur.total += convertToINR(Number(t.total_cost || 0), t.currency || "INR");
      categoryMap.set(cat, cur);
    });

    const typeMap = new Map<string, number>();
    tools.forEach(t => {
      const type = (t.subscription_type || "monthly").replace("_", " ");
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const deptMap = new Map<string, number>();
    active.forEach(t => {
      const dept = t.department || "Unassigned";
      deptMap.set(dept, (deptMap.get(dept) || 0) + convertToINR(Number(t.total_cost || 0), t.currency || "INR"));
    });

    const vendorSpendMap = new Map<string, number>();
    active.forEach(t => {
      const vName = (t.subscriptions_vendors as any)?.name || "No Vendor";
      vendorSpendMap.set(vName, (vendorSpendMap.get(vName) || 0) + convertToINR(Number(t.total_cost || 0), t.currency || "INR"));
    });

    const vendorCount = new Set(tools.map(t => t.vendor_id).filter(Boolean)).size;
    const totalSeats = tools.reduce((sum, t) => sum + (t.license_count || 0), 0);
    const assignedSeats = allLicenses?.filter(l => l.status === "assigned").length || 0;

    return {
      total: tools.length,
      activeCount: active.length,
      trialCount: trial.length,
      expiredCount: expired.length,
      expiringSoonCount: expiringSoon.length,
      pendingRenewals: renewals.filter(r => r.days_until >= 0 && (r.urgency === "critical" || r.urgency === "warning")).length,
      renewals30: renewals.filter(r => r.days_until >= 0 && r.days_until <= 30).length,
      renewals60: renewals.filter(r => r.days_until > 30 && r.days_until <= 60).length,
      renewals90: renewals.filter(r => r.days_until > 60 && r.days_until <= 90).length,
      monthlyBurn,
      annualCost,
      vendorCount,
      renewals,
      categories: Array.from(categoryMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total),
      typeDistribution: Array.from(typeMap.entries()).map(([name, value]) => ({ name, value })),
      departments: Array.from(deptMap.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
      topVendors: Array.from(vendorSpendMap.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 8),
      totalSeats,
      assignedSeats,
    };
  }, [tools, allLicenses]);

  // Portal top-bar actions into the module header
  const portalTarget = document.getElementById("module-header-portal");
  const topBarContent = (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <Button size="sm" className="gap-1 h-7 px-3" onClick={() => setIsAddOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        <span className="text-xs">New Subscription</span>
      </Button>
      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => navigate("/subscription/advanced?tab=licenses")}>
          <Key className="h-3 w-3" /> Licenses
        </Button>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => navigate("/subscription/advanced?tab=payments")}>
          <Receipt className="h-3 w-3" /> Payments
        </Button>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => navigate("/subscription/advanced?tab=vendors")}>
          <Building2 className="h-3 w-3" /> Vendors
        </Button>
      </div>
    </div>
  );

  if (isLoading && !tools) {
    return (
      <>
        {portalTarget && createPortal(topBarContent, portalTarget)}
        <div className="h-full overflow-y-auto p-3 space-y-3 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-52 rounded-lg" />
            <Skeleton className="h-52 rounded-lg" />
          </div>
        </div>
      </>
    );
  }

  if (!tools?.length) {
    return (
      <>
        {portalTarget && createPortal(topBarContent, portalTarget)}
        <div className="h-full flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No subscriptions yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Start tracking your IT subscriptions, licenses, and services in one place.
            </p>
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Your First Subscription
            </Button>
          </div>
          <AddToolDialog open={isAddOpen} onOpenChange={setIsAddOpen} onSuccess={() => setIsAddOpen(false)} editingTool={null} />
        </div>
      </>
    );
  }

  if (!analytics) return null;

  const utilizationPercent = analytics.totalSeats > 0
    ? Math.round((analytics.assignedSeats / analytics.totalSeats) * 100)
    : 0;

  const getRenewalRowClass = (days: number) => {
    if (days < 0) return "bg-destructive/5 hover:bg-destructive/10";
    if (days <= 7) return "bg-destructive/5 hover:bg-destructive/10";
    if (days <= 30) return "bg-orange-500/5 hover:bg-orange-500/10";
    return "hover:bg-muted/50";
  };

  const criticalRenewals = analytics.renewals.filter(r => r.urgency === "critical");

  return (
    <>
      {portalTarget && createPortal(topBarContent, portalTarget)}

      <div className="h-full overflow-y-auto bg-background">
        <div className="p-3 space-y-3">
          {/* Critical renewal alert banner */}
          {criticalRenewals.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-xs font-medium text-destructive">
                {criticalRenewals.length} subscription{criticalRenewals.length > 1 ? "s" : ""} need urgent attention
              </span>
              <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs text-destructive px-2" onClick={() => navigate("/subscription/tools")}>
                View <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}

          {/* Stat Cards — consolidated single row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <AssetStatCard
              title="Total"
              value={analytics.total}
              subtitle={`${analytics.activeCount} active`}
              icon={Package}
              iconBgColor="bg-blue-500"
              iconColor="text-white"
              onClick={() => navigate("/subscription/tools")}
              animationDelay={0}
            />
            <AssetStatCard
              title="Expiring Soon"
              value={analytics.expiringSoonCount}
              icon={AlertTriangle}
              iconBgColor="bg-yellow-500"
              iconColor="text-white"
              onClick={() => navigate("/subscription/tools")}
              animationDelay={20}
            />
            <AssetStatCard
              title="Expired"
              value={analytics.expiredCount}
              icon={Package}
              iconBgColor="bg-red-500"
              iconColor="text-white"
              onClick={() => navigate("/subscription/tools")}
              animationDelay={40}
            />
            <AssetStatCard
              title="Monthly ~INR"
              value={formatCostShort(analytics.monthlyBurn, "INR")}
              subtitle="Converted to INR"
              icon={TrendingUp}
              iconBgColor="bg-emerald-500"
              iconColor="text-white"
              onClick={() => navigate("/subscription/tools")}
              animationDelay={60}
            />
            <AssetStatCard
              title="Annual ~INR"
              value={formatCostShort(analytics.annualCost, "INR")}
              subtitle="Projected"
              icon={DollarSign}
              iconBgColor="bg-purple-500"
              iconColor="text-white"
              onClick={() => navigate("/subscription/tools")}
              animationDelay={80}
            />
            <AssetStatCard
              title="Vendors"
              value={analytics.vendorCount}
              subtitle={`${analytics.totalSeats} seats total`}
              icon={Building2}
              iconBgColor="bg-indigo-500"
              iconColor="text-white"
              onClick={() => navigate("/subscription/advanced?tab=vendors")}
              animationDelay={100}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analytics.categories.length > 0 && (
              <Card className="animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
                <CardContent className="p-3">
                  <h3 className="text-xs font-semibold mb-2">Spend by Category</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={analytics.categories} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        formatter={(value: number) => [formatCostShort(value, "INR"), "Spend"]}
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {analytics.typeDistribution.length > 0 && (
              <Card className="animate-fade-in" style={{ animationDelay: "220ms", animationFillMode: "backwards" }}>
                <CardContent className="p-3">
                  <h3 className="text-xs font-semibold mb-2">Subscription Types</h3>
                  <div className="flex items-center gap-3">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={analytics.typeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {analytics.typeDistribution.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1">
                      {analytics.typeDistribution.map((entry, i) => (
                        <div key={entry.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="capitalize text-muted-foreground">{entry.name}</span>
                          </div>
                          <span className="font-medium">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* License utilization + Department spend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analytics.totalSeats > 0 && (
              <Card className="animate-fade-in" style={{ animationDelay: "240ms", animationFillMode: "backwards" }}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-xs font-semibold">License Utilization</h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {analytics.assignedSeats} / {analytics.totalSeats} ({utilizationPercent}%)
                    </span>
                  </div>
                  <Progress value={utilizationPercent} className="h-1.5" />
                </CardContent>
              </Card>
            )}

            {analytics.departments.length > 0 && (
              <Card className="animate-fade-in" style={{ animationDelay: "260ms", animationFillMode: "backwards" }}>
                <CardContent className="p-3">
                  <h3 className="text-xs font-semibold mb-2">Spend by Department</h3>
                  <div className="space-y-1.5">
                    {analytics.departments.slice(0, 6).map(dept => {
                      const maxSpend = analytics.departments[0]?.total || 1;
                      const pct = Math.round((dept.total / maxSpend) * 100);
                      return (
                        <div key={dept.name} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">{dept.name}</span>
                            <span className="font-medium">{formatCostShort(dept.total, "INR")}</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {analytics.totalSeats === 0 && (
              <Card className="animate-fade-in" style={{ animationDelay: "240ms", animationFillMode: "backwards" }}>
                <CardContent className="p-3">
                  <h3 className="text-xs font-semibold mb-2">Status Overview</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/50">
                      <span className="text-[11px] text-muted-foreground">Active</span>
                      <Badge variant="default" className="text-[10px] h-4">{analytics.activeCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/50">
                      <span className="text-[11px] text-muted-foreground">Expiring</span>
                      <Badge className="text-[10px] h-4 bg-orange-500/10 text-orange-600 border-orange-200">{analytics.expiringSoonCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/50">
                      <span className="text-[11px] text-muted-foreground">Expired</span>
                      <Badge variant="destructive" className="text-[10px] h-4">{analytics.expiredCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-md bg-muted/50">
                      <span className="text-[11px] text-muted-foreground">Vendors</span>
                      <Badge variant="secondary" className="text-[10px] h-4">{analytics.vendorCount}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top Vendors by Spend */}
          {analytics.topVendors.length > 0 && (
            <Card className="animate-fade-in" style={{ animationDelay: "280ms", animationFillMode: "backwards" }}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-3.5 w-3.5" />
                  <h3 className="text-xs font-semibold">Top Vendors by Spend</h3>
                  <Button variant="ghost" size="sm" className="ml-auto gap-1 text-[11px] h-6 px-2" onClick={() => navigate("/subscription/advanced?tab=vendors")}>
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                  {analytics.topVendors.slice(0, 8).map((v, i) => (
                    <div key={v.name} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-medium text-muted-foreground w-3">{i + 1}.</span>
                        <span className="text-[11px] font-medium truncate">{v.name}</span>
                      </div>
                      <span className="text-[11px] font-semibold shrink-0 ml-1">{formatCostShort(v.total, "INR")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Renewals */}
          {analytics.renewals.length > 0 && (
            <Card className="animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <h3 className="text-xs font-semibold">Upcoming Renewals</h3>
                  <Badge variant="secondary" className="text-[10px] h-4 ml-1">{analytics.renewals.length}</Badge>
                  <Button variant="ghost" size="sm" className="ml-auto gap-1 text-[11px] h-6 px-2" onClick={() => navigate("/subscription/tools")}>
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] font-medium h-7">NAME</TableHead>
                        <TableHead className="text-[11px] font-medium h-7">VENDOR</TableHead>
                        <TableHead className="text-[11px] font-medium h-7">RENEWAL</TableHead>
                        <TableHead className="text-[11px] font-medium h-7">DAYS</TableHead>
                        <TableHead className="text-[11px] font-medium h-7 text-right">COST</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.renewals.slice(0, 10).map(r => (
                        <TableRow
                          key={r.id}
                          className={`cursor-pointer transition-colors ${getRenewalRowClass(r.days_until)}`}
                          onClick={() => navigate(`/subscription/detail/${r.id}`)}
                        >
                          <TableCell className="font-medium text-xs py-1.5">{r.tool_name}</TableCell>
                          <TableCell className="text-xs py-1.5">{r.vendor_name}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground py-1.5">
                            {format(new Date(r.renewal_date!), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Badge
                              variant={r.urgency === "critical" ? "destructive" : "secondary"}
                              className={cn("text-[10px]",
                                r.urgency === "warning" && "bg-orange-500/10 text-orange-600 border-orange-200",
                                r.urgency === "caution" && "bg-yellow-500/10 text-yellow-600 border-yellow-200",
                              )}
                            >
                              {r.days_until < 0 ? `${Math.abs(r.days_until)}d overdue` : `${r.days_until}d`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-right py-1.5">
                            {formatCost(Number(r.total_cost || 0), r.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AddToolDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={() => { setIsAddOpen(false); }}
        editingTool={null}
      />
    </>
  );
}
