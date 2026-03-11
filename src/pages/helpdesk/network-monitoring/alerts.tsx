import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface Alert {
  id: number; device: string; severity: "critical" | "warning" | "info"; type: string;
  message: string; triggeredAt: string; status: "active" | "acknowledged" | "resolved";
}

const severityBadge: Record<string, "destructive" | "secondary" | "outline"> = { critical: "destructive", warning: "secondary", info: "outline" };

export default function NetworkAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = alerts.filter(a => {
    if (search && !a.device.toLowerCase().includes(search.toLowerCase())) return false;
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  const updateStatus = (id: number, status: Alert["status"]) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    toast.success(`Alert ${status}`);
  };

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search device..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-sm" />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Triggered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="py-1.5"><Badge variant={severityBadge[a.severity]}>{a.severity}</Badge></TableCell>
                  <TableCell className="font-medium py-1.5">{a.device}</TableCell>
                  <TableCell className="py-1.5">{a.type}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate py-1.5">{a.message}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">{a.triggeredAt}</TableCell>
                  <TableCell className="py-1.5"><Badge variant="outline">{a.status}</Badge></TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex gap-0.5">
                      {a.status === "active" && <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => updateStatus(a.id, "acknowledged")}>Ack</Button>}
                      {a.status !== "resolved" && <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => updateStatus(a.id, "resolved")}>Resolve</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No alerts found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
