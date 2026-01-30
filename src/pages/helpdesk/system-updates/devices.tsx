import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Download, Server, Settings } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function DevicesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(searchParams.get("filter") || "all");

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      // @ts-ignore - Bypass deep type inference issue
      const { data, error } = await supabase
        .from("system_devices")
        .select("*")
        .eq("is_active", true)
        .order("hostname");

      if (error) throw error;
      setDevices(data || []);
    } catch (error: any) {
      console.error("Error fetching devices:", error);
      toast.error("Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      (device.hostname || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (device.ip_address || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (device.device_type || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === "all") return true;
    if (activeFilter === "compliant") return device.update_compliance_status === "compliant";
    if (activeFilter === "non_compliant") return device.update_compliance_status === "non_compliant";
    if (activeFilter === "pending") return (device.pending_updates_count || 0) > 0;
    if (activeFilter === "offline") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return !device.last_seen || new Date(device.last_seen) < sevenDaysAgo;
    }

    return true;
  });

  const getComplianceBadge = (status: string) => {
    if (status === "compliant") {
      return <Badge className="bg-primary">Compliant</Badge>;
    }
    if (status === "non_compliant") {
      return <Badge variant="destructive">Non-Compliant</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const exportDevices = () => {
    try {
      const csvContent = [
        [
          "Hostname",
          "IP Address",
          "Device Type",
          "OS Name",
          "Build",
          "Last Seen",
          "Compliance",
          "Pending Updates",
          "Installed Updates",
        ],
        ...filteredDevices.map((device) => [
          device.hostname || "",
          device.ip_address || "",
          device.device_type || "",
          device.os_name || "",
          device.os_build || "",
          device.last_seen ? new Date(device.last_seen).toLocaleString() : "Never",
          device.update_compliance_status || "Unknown",
          device.pending_updates_count || 0,
          device.installed_updates_count || 0,
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devices-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Devices exported successfully");
    } catch (error) {
      toast.error("Failed to export devices");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/system-updates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Devices</h1>
            <p className="text-sm text-muted-foreground">
              Manage devices and monitor update compliance
            </p>
          </div>
          <Button onClick={exportDevices} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/system-updates/settings")} className="h-8 gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Device Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Tabs value={activeFilter} onValueChange={setActiveFilter}>
                <TabsList>
                  <TabsTrigger value="all">All ({devices.length})</TabsTrigger>
                  <TabsTrigger value="compliant">
                    Compliant ({devices.filter((d) => d.update_compliance_status === "compliant").length})
                  </TabsTrigger>
                  <TabsTrigger value="non_compliant">
                    Non-Compliant (
                    {devices.filter((d) => d.update_compliance_status === "non_compliant").length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending Updates ({devices.filter((d) => (d.pending_updates_count || 0) > 0).length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search devices by hostname, IP, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading devices...</div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hostname</TableHead>
                        <TableHead>Device Type</TableHead>
                        <TableHead>OS</TableHead>
                        <TableHead>Last Seen</TableHead>
                        <TableHead>Compliance</TableHead>
                        <TableHead>Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDevices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No devices found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDevices.map((device) => (
                          <TableRow
                            key={device.id}
                            className="cursor-pointer hover:bg-accent"
                            onClick={() =>
                              navigate(`/system-updates/device-detail/${device.id}`)
                            }
                          >
                            <TableCell>
                              <div className="font-medium">{device.hostname || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {device.ip_address || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{device.device_type || "Unknown"}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {device.os_name || "N/A"}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {device.os_build || ""}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {device.last_seen
                                ? new Date(device.last_seen).toLocaleDateString()
                                : "Never"}
                            </TableCell>
                            <TableCell>{getComplianceBadge(device.update_compliance_status)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="font-medium">
                                  {device.pending_updates_count || 0}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}