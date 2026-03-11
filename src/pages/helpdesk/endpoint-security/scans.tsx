import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface Scan {
  id: number; endpoint: string; type: string; findings: number; critical: number;
  status: string; startedAt: string; duration: string;
}

export default function ScansPage() {
  const [scans] = useState<Scan[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = scans.filter(s => {
    const matchSearch = !search || s.endpoint.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || s.type === typeFilter;
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search scans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs">
            <SelectValue placeholder="Scan Type" />
          </SelectTrigger>
          <SelectContent className="w-[150px]">
            {["All", "Full", "Quick", "Custom"].map(t => (
              <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="w-[150px]">
            {["All", "completed", "running", "failed", "queued"].map(s => (
              <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-7 text-xs" onClick={() => toast.info("No endpoints to scan")}>Trigger New Scan</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead>Scan Type</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>Critical</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium py-1.5">{s.endpoint}</TableCell>
                  <TableCell className="py-1.5">{s.type}</TableCell>
                  <TableCell className="py-1.5">{s.findings}</TableCell>
                  <TableCell className="py-1.5">{s.critical > 0 ? <Badge variant="destructive">{s.critical}</Badge> : "0"}</TableCell>
                  <TableCell className="py-1.5"><Badge variant="outline">{s.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">{s.startedAt}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">{s.duration}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No scans found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
