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
  id: number; endpoint: string; severity: "critical" | "high" | "medium" | "low"; type: string;
  message: string; createdAt: string; status: "active" | "acknowledged" | "resolved";
}

const severityBadge: Record<string, "destructive" | "default" | "secondary" | "outline"> = { critical: "destructive", high: "default", medium: "secondary", low: "outline" };

export default function SecurityAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = alerts.filter(a => {
    const matchSearch = !search || a.endpoint.toLowerCase().includes(search.toLowerCase()) || a.message.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === "All" || a.severity === severityFilter;
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchSeverity && matchStatus;
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
          <Input placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-sm" />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent className="w-[150px]">
            {["All", "critical", "high", "medium", "low"].map(s => (
              <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="w-[150px]">
            {["All", "active", "acknowledged", "resolved"].map(s => (
              <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="py-1.5"><Badge variant={severityBadge[a.severity]}>{a.severity}</Badge></TableCell>
                  <TableCell className="font-medium py-1.5">{a.endpoint}</TableCell>
                  <TableCell className="py-1.5">{a.type}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate py-1.5">{a.message}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">{a.createdAt}</TableCell>
                  <TableCell className="py-1.5"><Badge variant="outline">{a.status}</Badge></TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex gap-1">
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
