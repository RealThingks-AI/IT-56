import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Filter, Eye, ShieldCheck, LayoutDashboard, FileText } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
interface AuditLog {
  id: number;
  user: string;
  action: string;
  module: string;
  timestamp: string;
  ip: string;
  status: 'success' | 'failed' | 'warning';
  details?: string;
}
export default function Audit() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Empty audit logs array - ready for backend data
  const allAuditLogs: AuditLog[] = [];

  // Client-side filtering
  const auditLogs = allAuditLogs.filter(log => {
    if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
    if (actionFilter !== 'all' && !log.action.toLowerCase().includes(actionFilter.toLowerCase())) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch = log.user?.toLowerCase().includes(search) || log.action?.toLowerCase().includes(search) || log.module?.toLowerCase().includes(search) || log.ip?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    return true;
  });
  const handleSelectLog = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? auditLogs.map(l => l.id) : []);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
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
                <LayoutDashboard className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5 px-3 text-sm h-7">
                
                Audit Logs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("logs")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold">0</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total Entries</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("logs")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold">0</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Entries Today</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("logs")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold">0</span>
                  </div>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("logs")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <span className="text-2xl font-bold">0</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-2 mt-2">
            {/* Compact Single Row Header - Match Tickets Layout */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="relative w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search audit logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8" />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="Tickets">Tickets</SelectItem>
                <SelectItem value="Assets">Assets</SelectItem>
                <SelectItem value="Settings">Settings</SelectItem>
                <SelectItem value="Users">Users</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="view">View</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-sm">Filter</span>
            </Button>

            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Download className="h-3.5 w-3.5" />
              <span className="text-sm">Export</span>
            </Button>
          </div>
        </div>

        {/* Table View - Match Tickets Layout */}
        {auditLogs.length === 0 ? <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
            <div className="rounded-full bg-muted p-4 mb-3">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No audit logs found</h3>
            <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
              {searchQuery || moduleFilter !== 'all' || actionFilter !== 'all' ? "Try adjusting your filters to see more audit logs" : "Audit logs will appear here as users perform actions"}
            </p>
          </div> : <div className="border rounded-lg overflow-hidden text-[0.85rem]">
            <Table>
              <TableHeader>
                <TableRow className="h-9">
                  <TableHead className="w-10 py-2">
                    <Checkbox checked={selectedIds.length === auditLogs.length && auditLogs.length > 0} onCheckedChange={handleSelectAll} />
                  </TableHead>
                  <TableHead className="py-2">User</TableHead>
                  <TableHead className="py-2">Action</TableHead>
                  <TableHead className="py-2">Module</TableHead>
                  <TableHead className="py-2">Status</TableHead>
                  <TableHead className="py-2">IP Address</TableHead>
                  <TableHead className="py-2">Timestamp</TableHead>
                  <TableHead className="text-right py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map(log => <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50 h-11">
                    <TableCell onClick={e => e.stopPropagation()} className="py-1.5">
                      <Checkbox checked={selectedIds.includes(log.id)} onCheckedChange={() => handleSelectLog(log.id)} />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="font-medium text-[0.85rem]">{log.user}</div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[0.8rem]">{log.action}</span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[0.75rem] px-1.5 py-0.5">
                        {log.module}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className={`${getStatusColor(log.status)} text-[0.75rem] px-1.5 py-0.5 capitalize`}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[0.8rem] font-mono">{log.ip}</span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="text-[0.8rem]">
                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-1.5" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>}
          </TabsContent>
        </Tabs>
      </div>
    </div>;
}