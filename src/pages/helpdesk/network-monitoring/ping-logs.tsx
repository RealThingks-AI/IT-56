import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface PingLog {
  id: number;
  device: string;
  time: string;
  response: number | null;
  status: string;
}

const PAGE_SIZE = 20;

export default function PingLogs() {
  const [logs] = useState<PingLog[]>([]);
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = logs.filter(l => {
    if (search && !l.device.toLowerCase().includes(search.toLowerCase())) return false;
    if (deviceFilter !== "all" && l.device !== deviceFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const devices = [...new Set(logs.map(l => l.device))];

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Filter by device..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-8 h-7 text-sm" />
        </div>
        <Select value={deviceFilter} onValueChange={v => { setDeviceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue placeholder="Device" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            {devices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-7 text-xs"><Download className="h-3.5 w-3.5 mr-1" />Export CSV</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Response (ms)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium py-1.5">{l.device}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">{l.time}</TableCell>
                  <TableCell className="py-1.5">{l.response !== null ? `${l.response}ms` : "—"}</TableCell>
                  <TableCell className="py-1.5"><Badge variant={l.status === "success" ? "default" : "destructive"}>{l.status}</Badge></TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No logs found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages} ({filtered.length} records)</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <Button variant="outline" size="sm" className="h-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
