import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HardDrive, Search } from "lucide-react";
import { format } from "date-fns";

const complianceBadge = (status: string | null) => {
  switch (status) {
    case "compliant":
      return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Compliant</Badge>;
    case "non_compliant":
      return <Badge variant="destructive">Non-Compliant</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export default function PatchingDevicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [complianceFilter, setComplianceFilter] = useState("all");

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["patching-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_devices")
        .select("*")
        .eq("is_active", true)
        .order("hostname");
      if (error) throw error;
      return data;
    },
  });

  const filtered = devices.filter((d) => {
    const matchesSearch =
      !search ||
      d.hostname.toLowerCase().includes(search.toLowerCase()) ||
      d.ip_address?.toLowerCase().includes(search.toLowerCase()) ||
      d.os_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCompliance = complianceFilter === "all" || d.update_compliance_status === complianceFilter;
    return matchesSearch && matchesCompliance;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patching — Devices</h1>
        <p className="text-sm text-muted-foreground mt-1">Managed devices and their update compliance status</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search hostname, IP, OS…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={complianceFilter} onValueChange={setComplianceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Compliance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="non_compliant">Non-Compliant</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <HardDrive className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">No devices found</p>
          <p className="text-xs mt-1">Devices will appear here once the agent reports in.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Installed</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((device) => (
                <TableRow
                  key={device.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => navigate(`/endpoint-security/endpoint-detail/${device.id}`)}
                >
                  <TableCell className="font-medium">{device.hostname}</TableCell>
                  <TableCell className="text-muted-foreground">{device.os_name || "—"} {device.os_version || ""}</TableCell>
                  <TableCell className="text-muted-foreground">{device.ip_address || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={device.status === "online" ? "default" : "secondary"}>
                      {device.status || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>{complianceBadge(device.update_compliance_status)}</TableCell>
                  <TableCell className="text-right">{device.pending_updates_count ?? 0}</TableCell>
                  <TableCell className="text-right">{device.installed_updates_count ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {device.last_seen ? format(new Date(device.last_seen), "MMM d, HH:mm") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
