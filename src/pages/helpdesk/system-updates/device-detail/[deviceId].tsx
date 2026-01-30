import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Server, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function DeviceDetailPage() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<any>(null);
  const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);
  const [installedUpdates, setInstalledUpdates] = useState<any[]>([]);
  const [updateHistory, setUpdateHistory] = useState<any[]>([]);
  const [ingestLogs, setIngestLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchDeviceDetails();
  }, [deviceId]);

  const fetchDeviceDetails = async () => {
    try {
      setLoading(true);

      // Fetch device - using actual schema columns
      // @ts-ignore - Bypass deep type inference issue
      const { data: deviceData, error: deviceError } = await supabase
        .from("system_devices")
        .select("*")
        .eq("id", deviceId)
        .eq("is_active", true)
        .single();

      if (deviceError) throw deviceError;
      setDevice(deviceData);

      // Fetch pending updates
      // @ts-ignore - Bypass deep type inference issue
      const { data: pendingData } = await supabase
        .from("system_pending_updates")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false });

      setPendingUpdates(pendingData || []);

      // Fetch installed updates
      // @ts-ignore - Bypass deep type inference issue
      const { data: installedData } = await supabase
        .from("system_installed_updates")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(50);

      setInstalledUpdates(installedData || []);

      // Fetch update history
      // @ts-ignore - Bypass deep type inference issue
      const { data: historyData } = await supabase
        .from("system_update_history")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(50);

      setUpdateHistory(historyData || []);

      // Fetch ingest logs
      // @ts-ignore - Bypass deep type inference issue
      const { data: logsData } = await supabase
        .from("system_update_ingest_logs")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(20);

      setIngestLogs(logsData || []);
    } catch (error: any) {
      console.error("Error fetching device details:", error);
      toast.error("Failed to load device details");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "important":
        return <Badge variant="default">Important</Badge>;
      case "moderate":
        return <Badge variant="secondary">Moderate</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading device details...</div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Device not found</p>
          <Button onClick={() => navigate("/system-updates/devices")} className="mt-4">
            Back to Devices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/system-updates/devices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Server className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{device.hostname || "Unknown Device"}</h1>
            <p className="text-sm text-muted-foreground font-mono">{device.id}</p>
          </div>
          <Badge
            variant={device.update_compliance_status === "compliant" ? "default" : "destructive"}
          >
            {device.update_compliance_status || "Unknown"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Device Type</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{device.device_type || "N/A"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">OS Version</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{device.os_name || "N/A"}</p>
              <p className="text-xs text-muted-foreground">{device.os_build || ""}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Last Seen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {device.last_seen ? new Date(device.last_seen).toLocaleDateString() : "Never"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {device.pending_updates_count || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <Tabs defaultValue="pending">
            <CardHeader>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending Updates ({pendingUpdates.length})
                </TabsTrigger>
                <TabsTrigger value="installed">
                  Installed Updates ({installedUpdates.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  History ({updateHistory.length})
                </TabsTrigger>
                <TabsTrigger value="logs">Ingest Logs ({ingestLogs.length})</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="pending">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KB Number</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Detected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUpdates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No pending updates
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingUpdates.map((update) => (
                        <TableRow
                          key={update.id}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() =>
                            navigate(`/system-updates/update-detail/${update.kb_number}`)
                          }
                        >
                          <TableCell className="font-mono text-sm">{update.kb_number}</TableCell>
                          <TableCell>{update.title}</TableCell>
                          <TableCell>{getSeverityBadge(update.severity)}</TableCell>
                          <TableCell className="text-sm">
                            {update.created_at ? new Date(update.created_at).toLocaleDateString() : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="installed">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KB Number</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Install Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installedUpdates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No installed updates
                        </TableCell>
                      </TableRow>
                    ) : (
                      installedUpdates.map((update) => (
                        <TableRow key={update.id}>
                          <TableCell className="font-mono text-sm">{update.kb_number}</TableCell>
                          <TableCell>{update.title}</TableCell>
                          <TableCell className="text-sm">
                            {update.installed_at ? new Date(update.installed_at).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">Installed</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="history">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>KB Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updateHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No history available
                        </TableCell>
                      </TableRow>
                    ) : (
                      updateHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.action || "Update"}</TableCell>
                          <TableCell className="font-mono text-sm">{entry.kb_number}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.status === "success"
                                  ? "default"
                                  : entry.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {entry.status || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.created_at ? new Date(entry.created_at).toLocaleString() : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="logs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Log ID</TableHead>
                      <TableHead>Ingested At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingestLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No ingest logs
                        </TableCell>
                      </TableRow>
                    ) : (
                      ingestLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">#{log.id}</TableCell>
                          <TableCell className="text-sm">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {log.status || "Processed"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}