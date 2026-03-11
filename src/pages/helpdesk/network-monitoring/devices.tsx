import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface Device {
  id: number; hostname: string; ip: string; type: string; location: string;
  status: "online" | "offline" | "warning"; lastPing: string; avgResponse: number; uptime: number;
}

const statusBadge: Record<string, "default" | "destructive" | "secondary"> = { online: "default", offline: "destructive", warning: "secondary" };

export default function NetworkDevices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ hostname: "", ip: "", type: "Server", location: "" });

  const filtered = devices.filter(d => {
    if (search && !d.hostname.toLowerCase().includes(search.toLowerCase()) && !d.ip.includes(search)) return false;
    if (typeFilter !== "all" && d.type !== typeFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    return true;
  });

  const handleAdd = () => {
    if (!newDevice.hostname || !newDevice.ip) { toast.error("Hostname and IP required"); return; }
    setDevices(prev => [...prev, { ...newDevice, id: Date.now(), status: "online", lastPing: new Date().toISOString(), avgResponse: 0, uptime: 100 } as Device]);
    setNewDevice({ hostname: "", ip: "", type: "Server", location: "" });
    setDialogOpen(false);
    toast.success("Device added");
  };

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search hostname or IP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["Server", "Switch", "Router", "Firewall", "AP", "Printer"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Device</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Device</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Hostname</Label><Input value={newDevice.hostname} onChange={e => setNewDevice(p => ({ ...p, hostname: e.target.value }))} /></div>
            <div><Label>IP Address</Label><Input value={newDevice.ip} onChange={e => setNewDevice(p => ({ ...p, ip: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={newDevice.type} onValueChange={v => setNewDevice(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Server", "Switch", "Router", "Firewall", "AP", "Printer"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Location</Label><Input value={newDevice.location} onChange={e => setNewDevice(p => ({ ...p, location: e.target.value }))} /></div>
            </div>
            <Button onClick={handleAdd} className="w-full">Add Device</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Ping</TableHead>
                <TableHead>Avg Response</TableHead>
                <TableHead>Uptime %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/network-monitoring/device-detail/${d.id}`)}>
                  <TableCell className="font-medium py-1.5">{d.hostname}</TableCell>
                  <TableCell className="font-mono text-xs py-1.5">{d.ip}</TableCell>
                  <TableCell className="py-1.5">{d.type}</TableCell>
                  <TableCell className="text-muted-foreground py-1.5">{d.location}</TableCell>
                  <TableCell className="py-1.5"><Badge variant={statusBadge[d.status]}>{d.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">{d.lastPing}</TableCell>
                  <TableCell className="py-1.5">{d.avgResponse}ms</TableCell>
                  <TableCell className="py-1.5">{d.uptime}%</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No devices found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
