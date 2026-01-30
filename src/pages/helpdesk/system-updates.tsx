import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Search, RefreshCw, Settings, Plus, Eye, Calendar, RotateCcw, LayoutDashboard, Server, AlertTriangle, CheckCircle, XCircle, Clock, FileDown } from "lucide-react";
import { SystemUpdate } from "@/components/SystemUpdates/UpdateCard";
import { ScheduleUpdateDialog } from "@/components/SystemUpdates/ScheduleUpdateDialog";
import { UpdateDetailsDialog } from "@/components/SystemUpdates/UpdateDetailsDialog";
import { ActiveMachinesList } from "@/components/UpdateManager/ActiveMachinesList";
import { toast } from "sonner";
import { format } from "date-fns";
export default function SystemUpdates() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<SystemUpdate | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Mock stats - in production these would come from the database
  const stats = {
    pending: updates.filter(u => u.status === 'pending').length,
    installing: updates.filter(u => u.status === 'installing').length,
    installed: updates.filter(u => u.status === 'installed').length,
    failed: updates.filter(u => u.status === 'failed').length
  };
  const filteredUpdates = updates.filter(update => {
    const matchesStatus = statusFilter === 'all' || update.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || update.category === categoryFilter;
    const matchesSearch = update.title.toLowerCase().includes(searchQuery.toLowerCase()) || update.description.toLowerCase().includes(searchQuery.toLowerCase()) || update.version?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });
  const handleInstall = (id: string) => {
    setUpdates(prev => prev.map(u => u.id === id ? {
      ...u,
      status: 'installing' as const,
      progress: 0
    } : u));
    toast.success("Update installation started");

    // Simulate installation progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUpdates(prev => prev.map(u => u.id === id ? {
        ...u,
        progress: Math.min(progress, 100)
      } : u));
      if (progress >= 100) {
        clearInterval(interval);
        setUpdates(prev => prev.map(u => u.id === id ? {
          ...u,
          status: 'installed' as const,
          progress: undefined
        } : u));
        toast.success("Update installed successfully");
      }
    }, 500);
  };
  const handleSchedule = (id: string) => {
    const update = updates.find(u => u.id === id);
    setSelectedUpdate(update);
    setScheduleDialogOpen(true);
  };
  const handleScheduleConfirm = (date: Date, time: string) => {
    if (selectedUpdate) {
      setUpdates(prev => prev.map(u => u.id === selectedUpdate.id ? {
        ...u,
        status: 'scheduled' as const
      } : u));
      toast.success(`Update scheduled for ${date.toLocaleDateString()} at ${time}`);
    }
  };
  const handleViewDetails = (id: string) => {
    const update = updates.find(u => u.id === id);
    setSelectedUpdate(update);
    setDetailsDialogOpen(true);
  };
  const handleRefresh = () => {
    toast.info("Checking for new updates...");
    // In production, this would fetch from your backend
  };
  const handleInstallAll = () => {
    const pendingUpdates = updates.filter(u => u.status === 'pending');
    if (pendingUpdates.length === 0) {
      toast.info("No pending updates to install");
      return;
    }
    toast.success(`Installing ${pendingUpdates.length} updates...`);
    pendingUpdates.forEach(u => handleInstall(u.id));
  };
  const handleSelectUpdate = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredUpdates.map(u => u.id) : []);
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'medium':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'low':
        return 'bg-green-500 hover:bg-green-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'scheduled':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'installing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'installed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleDownloadFile = async (filename: string) => {
    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) throw new Error('File not found');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      toast.error(`Failed to download ${filename}`);
    }
  };
  return <div className="min-h-screen bg-background">
      <div className="w-full px-4 pt-2 pb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <TabsList className="h-8">
              <TabsTrigger value="overview" className="gap-1.5 px-3 text-sm h-7">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="machines" className="gap-1.5 px-3 text-sm h-7">
                <Server className="h-3.5 w-3.5" />
                Active Machines
              </TabsTrigger>
              <TabsTrigger value="updates" className="gap-1.5 px-3 text-sm h-7">
                <Download className="h-3.5 w-3.5" />
                Updates
              </TabsTrigger>
            </TabsList>

            {activeTab === 'updates' && <>
                <div className="relative w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search updates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8" />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 h-8">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="text-sm">Check</span>
            </Button>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="installing">Installing</SelectItem>
                <SelectItem value="installed">Installed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="windows">Windows</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="firmware">Firmware</SelectItem>
                <SelectItem value="application">Application</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" onClick={handleInstallAll} className="gap-1.5 h-8">
              <Download className="h-3.5 w-3.5" />
              <span className="text-sm">Install All</span>
            </Button>

            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
              </>}
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("machines")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Server className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold">0</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Active Machines</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("updates")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold">{stats.pending}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Pending Updates</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("updates")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <RefreshCw className="h-4 w-4 text-yellow-600" />
                    <span className="text-2xl font-bold">{stats.installing}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("updates")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-2xl font-bold">{stats.failed}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Active Machines Tab */}
          <TabsContent value="machines" className="space-y-2 mt-2">
            <ActiveMachinesList />
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent value="updates" className="space-y-2 mt-2">
            {/* Table View - Match Tickets Layout */}
            {filteredUpdates.length === 0 ? <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No updates found</h3>
            <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
              {Object.keys({
                statusFilter,
                categoryFilter,
                searchQuery
              }).length > 0 ? "Try adjusting your filters to see more updates" : "No system updates available at this time"}
            </p>
          </div> : <div className="border rounded-lg overflow-hidden text-[0.85rem]">
            <Table>
              <TableHeader>
                <TableRow className="h-9">
                  <TableHead className="w-10 py-2">
                    <Checkbox checked={selectedIds.length === filteredUpdates.length && filteredUpdates.length > 0} onCheckedChange={handleSelectAll} />
                  </TableHead>
                  <TableHead className="py-2">Update ID</TableHead>
                  <TableHead className="py-2">Title</TableHead>
                  <TableHead className="py-2">Category</TableHead>
                  <TableHead className="py-2">Status</TableHead>
                  <TableHead className="py-2">Severity</TableHead>
                  <TableHead className="py-2">Version</TableHead>
                  <TableHead className="py-2">Size</TableHead>
                  <TableHead className="py-2">Date</TableHead>
                  <TableHead className="text-right py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUpdates.map(update => <TableRow key={update.id} className="cursor-pointer hover:bg-muted/50 h-11" onClick={() => handleViewDetails(update.id)}>
                    <TableCell onClick={e => e.stopPropagation()} className="py-1.5">
                      <Checkbox checked={selectedIds.includes(update.id)} onCheckedChange={() => handleSelectUpdate(update.id)} />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="font-mono text-[0.85rem]">{update.id}</span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="max-w-sm">
                        <div className="font-medium truncate text-[0.85rem]">{update.title}</div>
                        <div className="text-[0.75rem] text-muted-foreground truncate">
                          {update.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[0.75rem] px-1.5 py-0.5 capitalize">
                        {update.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className={`${getStatusColor(update.status)} text-[0.75rem] px-1.5 py-0.5`}>
                        {update.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge className={`${getSeverityColor(update.severity)} text-[0.75rem] px-1.5 py-0.5`}>
                        {update.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="font-mono text-[0.8rem]">{update.version}</span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[0.8rem]">{update.size}</span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="text-[0.8rem]">
                        {format(new Date(update.date), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-1.5" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetails(update.id)} title="View Details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {update.status === 'pending' && <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => {
                          e.stopPropagation();
                          handleSchedule(update.id);
                        }} title="Schedule">
                              <Calendar className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => {
                          e.stopPropagation();
                          handleInstall(update.id);
                        }} title="Install Now">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </>}
                        {update.status === 'failed' && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => {
                        e.stopPropagation();
                        handleInstall(update.id);
                      }} title="Retry">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>}
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ScheduleUpdateDialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen} updateTitle={selectedUpdate?.title} onSchedule={handleScheduleConfirm} />

        <UpdateDetailsDialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} update={selectedUpdate} />

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update Settings</DialogTitle>
              <DialogDescription>Configure system update preferences and download agent</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Agent Download Section */}
              <div className="space-y-3 pb-4 border-b">
                <div>
                  <Label className="text-base font-semibold">AppMaster Device Agent</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Download and deploy the Windows service agent for continuous device monitoring
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="default" 
                    className="w-full justify-start gap-2"
                    onClick={() => handleDownloadFile('AppMaster-Agent.ps1')}
                  >
                    <FileDown className="h-4 w-4" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">AppMaster-Agent.ps1</span>
                      <span className="text-xs text-muted-foreground/80">All-in-one installer & service (run as Administrator)</span>
                    </div>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run with <code className="bg-muted px-1 rounded">-Uninstall</code> flag to remove the service
                  </p>
                </div>
              </div>

              {/* Update Preferences */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Update Preferences</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Updates</Label>
                    <p className="text-sm text-muted-foreground">Install updates automatically</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Update Notifications</Label>
                    <p className="text-sm text-muted-foreground">Notify when updates are available</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Reboot</Label>
                    <p className="text-sm text-muted-foreground">Automatically restart after updates</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
}