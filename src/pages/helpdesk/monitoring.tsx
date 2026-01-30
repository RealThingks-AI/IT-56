import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, RefreshCw, Settings, Search, Eye, Edit, Bell, Activity } from "lucide-react";
import { AddMonitorDialog } from "@/components/Monitoring/AddMonitorDialog";
import { ConfigureAlertDialog } from "@/components/Monitoring/ConfigureAlertDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Monitor {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  value: string | number;
  unit?: string;
  lastChecked: string;
  alertsCount: number;
}
export default function Monitoring() {
  const [activeTab, setActiveTab] = useState("overview");
  const [addMonitorOpen, setAddMonitorOpen] = useState(false);
  const [configureAlertOpen, setConfigureAlertOpen] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  // Fetch monitors from database
  const { data: dbMonitors = [], isLoading, refetch } = useQuery({
    queryKey: ["monitors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitors")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 10000 : false, // Auto-refresh every 10 seconds if enabled
  });

  // Transform database monitors to UI format
  const allMonitors: Monitor[] = dbMonitors.map((m: any) => ({
    id: String(m.id),
    name: m.name,
    type: m.type || 'service',
    status: 'healthy' as const, // Default to healthy - would come from monitor_checks in production
    value: '-',
    unit: undefined,
    lastChecked: m.updated_at || m.created_at,
    alertsCount: 0, // Would come from monitor_alerts in production
  }));

  // Client-side filtering
  const monitors = allMonitors.filter(monitor => {
    if (statusFilter !== 'all' && monitor.status !== statusFilter) return false;
    if (typeFilter !== 'all' && monitor.type !== typeFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch = monitor.name?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const handleRefresh = () => {
    toast.info("Refreshing monitoring data...");
    refetch();
  };
  const handleAddMonitor = (monitor: any) => {
    toast.success(`Monitor "${monitor.name}" added successfully`);
  };
  const handleConfigureAlert = (id: string) => {
    const monitor = monitors.find(m => m.id === id);
    setSelectedMonitor(monitor?.name);
    setConfigureAlertOpen(true);
  };
  const handleSaveAlertConfig = (config: any) => {
    toast.success("Alert configuration saved successfully");
  };
  const handleSelectMonitor = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? monitors.map(m => m.id) : []);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  return <div className="min-h-screen bg-background">
      <div className="w-full px-4 pt-2 pb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <TabsList className="h-8">
              <TabsTrigger value="overview" className="gap-1.5 px-3 text-sm h-7">
                
                Overview
              </TabsTrigger>
              <TabsTrigger value="monitors" className="gap-1.5 px-3 text-sm h-7">
                
                Monitors
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("monitors")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold">{allMonitors.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total Monitors</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("monitors")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Eye className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold">{allMonitors.filter(m => m.status === 'healthy').length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Healthy</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("monitors")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Bell className="h-4 w-4 text-orange-600" />
                    <span className="text-2xl font-bold">{allMonitors.filter(m => m.status === 'warning').length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("monitors")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Bell className="h-4 w-4 text-red-600" />
                    <span className="text-2xl font-bold">{allMonitors.filter(m => m.status === 'critical').length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Critical Alerts</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monitors" className="space-y-2 mt-2">
            {/* Compact Single Row Header - Match Tickets Layout */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="relative w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search monitors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8" />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="gap-1.5 h-8">
              <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span className="text-sm">{autoRefresh ? "Auto" : "Manual"}</span>
            </Button>

            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 h-8">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="text-sm">Refresh</span>
            </Button>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="network">Network</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" onClick={() => setAddMonitorOpen(true)} className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" />
              <span className="text-sm">Add Monitor</span>
            </Button>

            <Button variant="outline" size="icon" className="h-8 w-8">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Table View - Match Tickets Layout */}
        {monitors.length === 0 ? <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No monitors found</h3>
            <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' ? "Try adjusting your filters to see more monitors" : "Get started by adding your first system monitor"}
            </p>
            {searchQuery === '' && statusFilter === 'all' && typeFilter === 'all' && <Button size="sm" onClick={() => setAddMonitorOpen(true)} className="gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" />
                <span className="text-sm">Add First Monitor</span>
              </Button>}
          </div> : <div className="border rounded-lg overflow-hidden text-[0.85rem]">
            <Table>
              <TableHeader>
                <TableRow className="h-9">
                  <TableHead className="w-10 py-2">
                    <Checkbox checked={selectedIds.length === monitors.length && monitors.length > 0} onCheckedChange={handleSelectAll} />
                  </TableHead>
                  <TableHead className="py-2">Monitor Name</TableHead>
                  <TableHead className="py-2">Type</TableHead>
                  <TableHead className="py-2">Status</TableHead>
                  <TableHead className="py-2">Current Value</TableHead>
                  <TableHead className="py-2">Alerts</TableHead>
                  <TableHead className="py-2">Last Checked</TableHead>
                  <TableHead className="text-right py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monitors.map(monitor => <TableRow key={monitor.id} className="cursor-pointer hover:bg-muted/50 h-11">
                    <TableCell onClick={e => e.stopPropagation()} className="py-1.5">
                      <Checkbox checked={selectedIds.includes(monitor.id)} onCheckedChange={() => handleSelectMonitor(monitor.id)} />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="font-medium text-[0.85rem]">{monitor.name}</div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[0.75rem] px-1.5 py-0.5 capitalize">
                        {monitor.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className={`${getStatusColor(monitor.status)} text-[0.75rem] px-1.5 py-0.5 capitalize`}>
                        {monitor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[0.8rem] font-mono">
                        {monitor.value}
                        {monitor.unit && ` ${monitor.unit}`}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {monitor.alertsCount > 0 ? <Badge variant="destructive" className="text-[0.75rem] px-1.5 py-0.5">
                          {monitor.alertsCount}
                        </Badge> : <span className="text-[0.8rem] text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="text-[0.8rem]">
                        {format(new Date(monitor.lastChecked), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-1.5" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => {
                        e.stopPropagation();
                        handleConfigureAlert(monitor.id);
                      }} title="Configure Alert">
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>}

        {/* Dialogs */}
        <AddMonitorDialog open={addMonitorOpen} onOpenChange={setAddMonitorOpen} onAdd={handleAddMonitor} />

        <ConfigureAlertDialog open={configureAlertOpen} onOpenChange={setConfigureAlertOpen} monitorName={selectedMonitor} onSave={handleSaveAlertConfig} />
          </TabsContent>
        </Tabs>
      </div>
    </div>;
}