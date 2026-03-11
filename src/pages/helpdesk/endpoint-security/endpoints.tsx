import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Endpoint {
  id: number; hostname: string; ip: string; os: string; avStatus: "active" | "outdated" | "missing";
  firewall: boolean; diskEncrypted: boolean; lastPatch: string; lastScan: string; complianceScore: number;
}

const avIcon = { active: <CheckCircle className="h-4 w-4 text-chart-3" />, outdated: <AlertTriangle className="h-4 w-4 text-chart-2" />, missing: <XCircle className="h-4 w-4 text-destructive" /> };
const boolIcon = (v: boolean) => v ? <CheckCircle className="h-4 w-4 text-chart-3" /> : <XCircle className="h-4 w-4 text-destructive" />;

const osOptions = ["All", "Windows 11", "Windows 10", "macOS 14", "Ubuntu 24"];

export default function EndpointsList() {
  const navigate = useNavigate();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [search, setSearch] = useState("");
  const [osFilter, setOsFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEp, setNewEp] = useState({ hostname: "", ip: "", os: "Windows 11" });

  const filtered = endpoints.filter(e => {
    const matchSearch = !search || e.hostname.toLowerCase().includes(search.toLowerCase()) || e.ip.includes(search);
    const matchOs = osFilter === "All" || e.os === osFilter;
    return matchSearch && matchOs;
  });

  const handleAdd = () => {
    if (!newEp.hostname || !newEp.ip) { toast.error("Hostname and IP required"); return; }
    setEndpoints(prev => [...prev, { ...newEp, id: Date.now(), avStatus: "active", firewall: true, diskEncrypted: true, lastPatch: "—", lastScan: "—", complianceScore: 100 } as Endpoint]);
    setNewEp({ hostname: "", ip: "", os: "Windows 11" });
    setDialogOpen(false);
    toast.success("Endpoint added");
  };

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search endpoints..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-sm" />
        </div>
        <Select value={osFilter} onValueChange={setOsFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs">
            <SelectValue placeholder="OS" />
          </SelectTrigger>
          <SelectContent className="w-[150px]">
            {osOptions.map(o => (
              <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" className="h-7 text-xs"><Plus className="h-3.5 w-3.5 mr-1" />Add Endpoint</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Endpoint</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Hostname</Label><Input value={newEp.hostname} onChange={e => setNewEp(p => ({ ...p, hostname: e.target.value }))} /></div>
              <div><Label>IP Address</Label><Input value={newEp.ip} onChange={e => setNewEp(p => ({ ...p, ip: e.target.value }))} /></div>
              <div>
                <Label>OS</Label>
                <Select value={newEp.os} onValueChange={v => setNewEp(p => ({ ...p, os: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Windows 11", "Windows 10", "macOS 14", "Ubuntu 24"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full">Add Endpoint</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Antivirus</TableHead>
                <TableHead>Firewall</TableHead>
                <TableHead>Encrypted</TableHead>
                <TableHead>Last Patch</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/endpoint-security/endpoint-detail/${e.id}`)}>
                  <TableCell className="font-medium py-1.5">{e.hostname}</TableCell>
                  <TableCell className="font-mono text-xs py-1.5">{e.ip}</TableCell>
                  <TableCell className="py-1.5">{e.os}</TableCell>
                  <TableCell className="py-1.5"><div className="flex items-center gap-1">{avIcon[e.avStatus]}<span className="text-xs capitalize">{e.avStatus}</span></div></TableCell>
                  <TableCell className="py-1.5">{boolIcon(e.firewall)}</TableCell>
                  <TableCell className="py-1.5">{boolIcon(e.diskEncrypted)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">{e.lastPatch}</TableCell>
                  <TableCell className="py-1.5"><Badge variant={e.complianceScore === 100 ? "default" : e.complianceScore >= 75 ? "secondary" : "destructive"}>{e.complianceScore}%</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No endpoints found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
