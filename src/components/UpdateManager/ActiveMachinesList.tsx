import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

interface SystemDevice {
  id: string;
  hostname: string | null;
  device_type: string | null;
  os_name: string | null;
  os_version: string | null;
  last_seen: string | null;
  last_update_check: string | null;
  update_compliance_status: string | null;
  pending_updates_count: number | null;
  is_active: boolean;
  created_at: string;
}

const ComplianceStatusBadge = ({ status, pendingCount }: { 
  status: string | null; 
  pendingCount: number | null;
}) => {
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

  if (pendingCount && pendingCount > 0) {
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

async function fetchActiveMachines(): Promise<SystemDevice[]> {
  try {
    // In single-company mode, just fetch all active devices - RLS handles access
    const result = await supabase
      .from("system_devices")
      .select("id, hostname, device_type, os_name, os_version, last_seen, last_update_check, update_compliance_status, pending_updates_count, is_active, created_at")
      .eq("is_active", true);

    if (result.error) throw result.error;
    
    const devices = (result.data || []) as SystemDevice[];
    // Sort in memory
    return devices.sort((a, b) => {
      const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching active machines:', error);
    return [];
  }
}

export const ActiveMachinesList = () => {
  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["active-machines"],
    queryFn: fetchActiveMachines,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalMachines = machines.length;
  const compliantMachines = machines.filter(m => m.update_compliance_status === 'compliant').length;
  const pendingMachines = machines.filter(m => (m.pending_updates_count || 0) > 0).length;
  const failedMachines = machines.filter(m => m.update_compliance_status === 'failed').length;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Monitor className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{totalMachines}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Machines</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{compliantMachines}</span>
            </div>
            <p className="text-xs text-muted-foreground">Compliant</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold">{pendingMachines}</span>
            </div>
            <p className="text-xs text-muted-foreground">Updates Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold">{failedMachines}</span>
            </div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Machines Table */}
      {machines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
          <div className="rounded-full bg-muted p-4 mb-3">
            <Monitor className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No machines synced yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Download and run the device agent on your machines to start tracking updates
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="h-10">
                <TableHead>Hostname</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Compliance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine) => (
                <TableRow key={machine.id} className="h-12">
                  <TableCell>
                    <div className="font-medium text-sm">{machine.hostname || "Unknown"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {machine.os_name || "Unknown"}
                      {machine.os_version && (
                        <div className="text-xs text-muted-foreground">{machine.os_version}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {machine.last_seen
                        ? format(new Date(machine.last_seen), "MMM d, HH:mm")
                        : "Never"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {machine.last_update_check
                        ? format(new Date(machine.last_update_check), "MMM d, HH:mm")
                        : "Never"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{machine.pending_updates_count || 0}</span>
                  </TableCell>
                  <TableCell>
                    <ComplianceStatusBadge 
                      status={machine.update_compliance_status}
                      pendingCount={machine.pending_updates_count}
                    />
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
