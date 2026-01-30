import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface UpdateDetail {
  kb_number: string;
  title: string;
  severity: string;
  created_at: string;
}

interface AffectedDevice {
  device_id: string;
  hostname: string;
  status: string;
  detected_at: string;
}

export default function UpdateDetailPage() {
  const { kbNumber } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updateDetail, setUpdateDetail] = useState<UpdateDetail | null>(null);
  const [affectedDevices, setAffectedDevices] = useState<AffectedDevice[]>([]);
  const [installedDevices, setInstalledDevices] = useState<AffectedDevice[]>([]);

  useEffect(() => {
    fetchUpdateDetails();
  }, [kbNumber]);

  const fetchUpdateDetails = async () => {
    try {
      setLoading(true);

      // Fetch pending update details
      // @ts-ignore - Bypass deep type inference issue
      const { data: pendingData } = await supabase
        .from("system_pending_updates")
        .select(`
          id,
          kb_number,
          title,
          severity,
          created_at,
          device_id,
          system_devices!inner(id, hostname)
        `)
        .eq("kb_number", kbNumber);

      if (pendingData && pendingData.length > 0) {
        const first = pendingData[0] as any;
        setUpdateDetail({
          kb_number: first.kb_number,
          title: first.title || "Unknown Update",
          severity: first.severity || "Unknown",
          created_at: first.created_at,
        });

        setAffectedDevices(
          pendingData.map((item: any) => ({
            device_id: item.device_id,
            hostname: item.system_devices?.hostname || "Unknown",
            status: "pending",
            detected_at: item.created_at,
          }))
        );
      }

      // Fetch installed updates for this KB
      // @ts-ignore - Bypass deep type inference issue
      const { data: installedData } = await supabase
        .from("system_installed_updates")
        .select(`
          id,
          kb_number,
          title,
          installed_at,
          device_id,
          system_devices!inner(id, hostname)
        `)
        .eq("kb_number", kbNumber);

      if (installedData) {
        if (!updateDetail && installedData.length > 0) {
          const first = installedData[0] as any;
          setUpdateDetail({
            kb_number: first.kb_number,
            title: first.title || "Unknown Update",
            severity: "N/A",
            created_at: first.installed_at,
          });
        }

        setInstalledDevices(
          installedData.map((item: any) => ({
            device_id: item.device_id,
            hostname: item.system_devices?.hostname || "Unknown",
            status: "installed",
            detected_at: item.installed_at,
          }))
        );
      }
    } catch (error: any) {
      console.error("Error fetching update details:", error);
      toast.error("Failed to load update details");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "destructive";
      case "important":
        return "default";
      case "moderate":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading update details...</div>
      </div>
    );
  }

  if (!updateDetail) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Update not found</p>
          <Button onClick={() => navigate("/system-updates/updates")} className="mt-4">
            Back to Updates
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
            onClick={() => navigate("/system-updates/updates")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{updateDetail.kb_number}</h1>
            <p className="text-sm text-muted-foreground">{updateDetail.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">KB Number</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm">{updateDetail.kb_number}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={getSeverityColor(updateDetail.severity) as any}>
                {updateDetail.severity}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">First Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                {updateDetail.created_at ? new Date(updateDetail.created_at).toLocaleDateString() : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Affected Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({affectedDevices.length})
                </TabsTrigger>
                <TabsTrigger value="installed">
                  Installed ({installedDevices.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Detected At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affectedDevices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No pending devices
                        </TableCell>
                      </TableRow>
                    ) : (
                      affectedDevices.map((device) => (
                        <TableRow
                          key={device.device_id}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() =>
                            navigate(`/system-updates/device-detail/${device.device_id}`)
                          }
                        >
                          <TableCell className="font-medium">{device.hostname}</TableCell>
                          <TableCell>
                            {device.detected_at ? new Date(device.detected_at).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
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
                      <TableHead>Hostname</TableHead>
                      <TableHead>Installed At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installedDevices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No installed devices
                        </TableCell>
                      </TableRow>
                    ) : (
                      installedDevices.map((device) => (
                        <TableRow
                          key={device.device_id}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() =>
                            navigate(`/system-updates/device-detail/${device.device_id}`)
                          }
                        >
                          <TableCell className="font-medium">{device.hostname}</TableCell>
                          <TableCell>
                            {device.detected_at ? new Date(device.detected_at).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Installed
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}