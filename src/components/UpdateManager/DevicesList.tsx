import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  RefreshCw, 
  CheckCircle, 
  Laptop,
  Monitor,
  Server,
  Clock,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { useUpdateDevices, SystemDevice } from "@/hooks/useUpdateManager";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const DeviceTypeIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case "laptop":
      return <Laptop className="h-4 w-4" />;
    case "server":
      return <Server className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

const ComplianceStatusBadge = ({ status }: { status: string | null }) => {
  if (status === 'compliant') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
        <CheckCircle className="h-3 w-3" />
        Compliant
      </Badge>
    );
  }

  if (status === 'failed') {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300 gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 gap-1">
        <Clock className="h-3 w-3" />
        Updates Pending
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 gap-1">
      <AlertTriangle className="h-3 w-3" />
      Unknown
    </Badge>
  );
};

export const DevicesList = () => {
  const { data: devices, isLoading } = useUpdateDevices();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredDevices = (devices || []).filter((device) => {
    const matchesSearch =
      device.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ip_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.os_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || device.update_compliance_status === statusFilter;
    const matchesType = typeFilter === "all" || device.device_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredDevices.map((d) => d.id) : []);
  };

  const handleSelectDevice = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["update-devices"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="laptop">Laptops</SelectItem>
            <SelectItem value="desktop">Desktops</SelectItem>
            <SelectItem value="server">Servers</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredDevices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
          <div className="rounded-full bg-muted p-4 mb-3">
            <Monitor className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No devices found</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            {devices?.length === 0
              ? "Install the device agent on machines to start tracking updates"
              : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="h-10">
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length === filteredDevices.length && filteredDevices.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Pending Updates</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead>Compliance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device) => (
                <TableRow key={device.id} className="h-12">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(device.id)}
                      onCheckedChange={() => handleSelectDevice(device.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{device.hostname || "Unknown"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm capitalize">
                      <DeviceTypeIcon type={device.device_type} />
                      {device.device_type || "Desktop"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {device.os_name || "Unknown"}
                      {device.os_version && (
                        <div className="text-xs text-muted-foreground">{device.os_version}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{device.ip_address || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{device.pending_updates_count || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {device.last_update_check
                        ? format(new Date(device.last_update_check), "MMM d, HH:mm")
                        : "Never"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ComplianceStatusBadge status={device.update_compliance_status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
