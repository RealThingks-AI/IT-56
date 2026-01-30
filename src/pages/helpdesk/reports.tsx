import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Calendar, Search, Eye, TrendingUp, BarChart, LayoutDashboard, Ticket, Package } from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Report {
  id: number;
  title: string;
  type: string;
  description: string;
  period: string;
  generated: string;
  status: 'ready' | 'generating' | 'failed';
  size: string;
}

export default function ReportsModule() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [ticketDateRange, setTicketDateRange] = useState("30days");

  // Empty reports array - ready for backend data
  const allReports: Report[] = [];

  // Client-side filtering
  const reports = allReports.filter(report => {
    if (typeFilter !== 'all' && report.type !== typeFilter) return false;
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch = report.title?.toLowerCase().includes(search) || report.description?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const handleSelectReport = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? reports.map(r => r.id) : []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'generating':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Ticket Reports Data
  const getTicketDateRange = () => {
    const end = new Date();
    let start = new Date();

    switch (ticketDateRange) {
      case "7days":
        start = subDays(end, 7);
        break;
      case "30days":
        start = subDays(end, 30);
        break;
      case "thisMonth":
        start = startOfMonth(end);
        break;
      case "90days":
        start = subDays(end, 90);
        break;
      default:
        start = subDays(end, 30);
    }

    return { start, end };
  };

  const { start: ticketStart, end: ticketEnd } = getTicketDateRange();

  const { data: ticketStats, isLoading: ticketStatsLoading } = useQuery({
    queryKey: ["ticket-reports", ticketDateRange],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from("helpdesk_tickets")
        .select("*, category:helpdesk_categories(name)")
        .gte("created_at", ticketStart.toISOString())
        .lte("created_at", ticketEnd.toISOString());

      if (error) throw error;

      const total = tickets?.length || 0;
      const resolved = tickets?.filter((t) => t.status === "resolved").length || 0;
      const closed = tickets?.filter((t) => t.status === "closed").length || 0;
      const slaBreached = tickets?.filter((t) => t.sla_breached).length || 0;
      
      const resolvedTickets = tickets?.filter((t) => t.resolved_at) || [];
      const avgResolutionTime = resolvedTickets.length > 0
        ? resolvedTickets.reduce((acc, t) => {
            const created = new Date(t.created_at!).getTime();
            const resolvedAt = new Date(t.resolved_at!).getTime();
            return acc + (resolvedAt - created);
          }, 0) / resolvedTickets.length / (1000 * 60 * 60)
        : 0;

      const byPriority = {
        urgent: tickets?.filter((t) => t.priority === "urgent").length || 0,
        high: tickets?.filter((t) => t.priority === "high").length || 0,
        medium: tickets?.filter((t) => t.priority === "medium").length || 0,
        low: tickets?.filter((t) => t.priority === "low").length || 0,
      };

      const categoryMap = new Map();
      tickets?.forEach((t) => {
        const catName = (t.category as any)?.name || "Uncategorized";
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
      });
      const byCategory = Array.from(categoryMap.entries()).map(([name, count]) => ({
        name,
        count,
      }));

      return {
        total,
        resolved,
        closed,
        slaBreached,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        resolutionRate: total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0,
        byPriority,
        byCategory,
      };
    },
  });

  const handleTicketExport = () => {
    if (!ticketStats) return;

    const csvContent = [
      ["Ticket Reports", `${format(ticketStart, "MMM d, yyyy")} - ${format(ticketEnd, "MMM d, yyyy")}`],
      [],
      ["Metric", "Value"],
      ["Total Tickets", ticketStats.total],
      ["Resolved Tickets", ticketStats.resolved],
      ["Closed Tickets", ticketStats.closed],
      ["SLA Breached", ticketStats.slaBreached],
      ["Resolution Rate", `${ticketStats.resolutionRate}%`],
      ["Avg Resolution Time", `${ticketStats.avgResolutionTime} hours`],
      [],
      ["Priority Distribution"],
      ["Urgent", ticketStats.byPriority.urgent],
      ["High", ticketStats.byPriority.high],
      ["Medium", ticketStats.byPriority.medium],
      ["Low", ticketStats.byPriority.low],
      [],
      ["Category Distribution"],
      ...ticketStats.byCategory.map((cat) => [cat.name, cat.count]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 pt-2 pb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <TabsList className="h-8">
              <TabsTrigger value="overview" className="gap-1.5 px-3 text-sm h-7">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-1.5 px-3 text-sm h-7">
                <Ticket className="h-3.5 w-3.5" />
                Tickets
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-1.5 px-3 text-sm h-7">
                <Package className="h-3.5 w-3.5" />
                Assets
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5 px-3 text-sm h-7">
                <BarChart className="h-3.5 w-3.5" />
                Reports
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("tickets")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Ticket className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold">{ticketStats?.total || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total Tickets (30 days)</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("tickets")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold">{ticketStats?.resolutionRate || 0}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Resolution Rate</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("reports")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold">{reports.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Generated Reports</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("reports")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Download className="h-4 w-4 text-purple-600" />
                    <span className="text-2xl font-bold">0</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Downloads</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tickets Analytics Tab */}
          <TabsContent value="tickets" className="space-y-4 mt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold">Ticket Analytics</h2>
                  <p className="text-xs text-muted-foreground">
                    {format(ticketStart, "MMM d, yyyy")} - {format(ticketEnd, "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={ticketDateRange} onValueChange={setTicketDateRange}>
                  <SelectTrigger className="w-[140px] h-8">
                    <Calendar className="h-3.5 w-3.5 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>

                <Button size="sm" className="h-8" onClick={handleTicketExport}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export CSV
                </Button>
              </div>
            </div>

            {ticketStatsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : ticketStats ? (
              <div className="space-y-4">
                {/* Overview Stats */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Total Tickets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{ticketStats.total}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Resolution Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{ticketStats.resolutionRate}%</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Avg Resolution Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{ticketStats.avgResolutionTime}h</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        SLA Breached
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {ticketStats.slaBreached}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Stats */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Resolved</span>
                        <Badge variant="secondary">{ticketStats.resolved}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Closed</span>
                        <Badge variant="secondary">{ticketStats.closed}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>In Progress</span>
                        <Badge variant="secondary">
                          {ticketStats.total - ticketStats.resolved - ticketStats.closed}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Priority Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Urgent</span>
                        <Badge className="bg-red-500 hover:bg-red-600">{ticketStats.byPriority.urgent}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>High</span>
                        <Badge className="bg-orange-500 hover:bg-orange-600">{ticketStats.byPriority.high}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Medium</span>
                        <Badge className="bg-yellow-500 hover:bg-yellow-600">{ticketStats.byPriority.medium}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Low</span>
                        <Badge className="bg-green-500 hover:bg-green-600">{ticketStats.byPriority.low}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Category Breakdown */}
                {ticketStats.byCategory.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Tickets by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {ticketStats.byCategory.map((cat) => (
                          <div key={cat.name} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                            <span>{cat.name}</span>
                            <Badge variant="outline">{cat.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </TabsContent>

          {/* Assets Analytics Tab */}
          <TabsContent value="assets" className="space-y-4 mt-2">
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
              <div className="rounded-full bg-muted p-4 mb-3">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">Asset Analytics</h3>
              <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
                Asset analytics and reports will be available here. Track asset utilization, depreciation, and more.
              </p>
            </div>
          </TabsContent>

          {/* Generated Reports Tab */}
          <TabsContent value="reports" className="space-y-2 mt-2">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <div className="relative w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search reports..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8" />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-sm">Date Range</span>
                </Button>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="generating">Generating</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="tickets">Tickets</SelectItem>
                    <SelectItem value="assets">Assets</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="sla">SLA</SelectItem>
                  </SelectContent>
                </Select>

                <Button size="sm" className="gap-1.5 h-8">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-sm">Generate</span>
                </Button>

                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-sm">Export</span>
                </Button>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
                <div className="rounded-full bg-muted p-4 mb-3">
                  <BarChart className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold mb-1">No reports found</h3>
                <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
                  {searchQuery || typeFilter !== 'all' || statusFilter !== 'all' 
                    ? "Try adjusting your filters to see more reports" 
                    : "Get started by generating your first report"}
                </p>
                {searchQuery === '' && typeFilter === 'all' && statusFilter === 'all' && (
                  <Button size="sm" className="gap-1.5 h-8">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-sm">Generate First Report</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden text-[0.85rem]">
                <Table>
                  <TableHeader>
                    <TableRow className="h-9">
                      <TableHead className="w-10 py-2">
                        <Checkbox checked={selectedIds.length === reports.length && reports.length > 0} onCheckedChange={handleSelectAll} />
                      </TableHead>
                      <TableHead className="py-2">Report Name</TableHead>
                      <TableHead className="py-2">Type</TableHead>
                      <TableHead className="py-2">Description</TableHead>
                      <TableHead className="py-2">Period</TableHead>
                      <TableHead className="py-2">Status</TableHead>
                      <TableHead className="py-2">Size</TableHead>
                      <TableHead className="py-2">Generated</TableHead>
                      <TableHead className="text-right py-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map(report => (
                      <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50 h-11">
                        <TableCell onClick={e => e.stopPropagation()} className="py-1.5">
                          <Checkbox checked={selectedIds.includes(report.id)} onCheckedChange={() => handleSelectReport(report.id)} />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="font-medium text-[0.85rem]">{report.title}</div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className="text-[0.75rem] px-1.5 py-0.5 capitalize">
                            {report.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="max-w-md">
                            <div className="text-[0.8rem] text-muted-foreground truncate">
                              {report.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-[0.8rem]">{report.period}</span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className={`${getStatusColor(report.status)} text-[0.75rem] px-1.5 py-0.5 capitalize`}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-[0.8rem]">{report.size}</span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="text-[0.8rem]">
                            {format(new Date(report.generated), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-1.5" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Download">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
