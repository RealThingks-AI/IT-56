import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Download, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IngestLog {
  id: number;
  device_id: number | null;
  payload: any;
  ingested_at: string;
  device_name?: string;
}

export default function IngestLogPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<IngestLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<IngestLog | null>(null);
  const [showPayloadDialog, setShowPayloadDialog] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("system_update_ingest_logs")
        .select(`
          id,
          device_id,
          payload,
          ingested_at,
          system_devices(device_name)
        `)
        .order("ingested_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedLogs = (data || []).map((log: any) => ({
        id: log.id,
        device_id: log.device_id,
        payload: log.payload,
        ingested_at: log.ingested_at,
        device_name: log.system_devices?.device_name || "Unknown",
      }));

      setLogs(formattedLogs);
    } catch (error: any) {
      console.error("Error fetching ingest logs:", error);
      toast.error("Failed to load ingest logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return (
      log.device_name?.toLowerCase().includes(query) ||
      log.id.toString().includes(query) ||
      JSON.stringify(log.payload).toLowerCase().includes(query)
    );
  });

  const handleViewPayload = (log: IngestLog) => {
    setSelectedLog(log);
    setShowPayloadDialog(true);
  };

  const exportLogs = () => {
    try {
      const csvContent = [
        ["ID", "Device Name", "Device ID", "Ingested At", "Payload"],
        ...filteredLogs.map((log) => [
          log.id,
          log.device_name || "N/A",
          log.device_id || "N/A",
          new Date(log.ingested_at).toLocaleString(),
          JSON.stringify(log.payload),
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ingest-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Logs exported successfully");
    } catch (error) {
      toast.error("Failed to export logs");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/helpdesk/system-updates")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Ingest Logs</h1>
            <p className="text-sm text-muted-foreground">
              View data ingestion logs from devices and RMM tools
            </p>
          </div>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Ingestion Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs by device, ID, or payload content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchLogs}>
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Log ID</TableHead>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Ingested At</TableHead>
                      <TableHead>Payload Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No ingest logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">#{log.id}</TableCell>
                          <TableCell>
                            {log.device_id ? (
                              <button
                                onClick={() =>
                                  navigate(`/helpdesk/system-updates/device-detail/${log.device_id}`)
                                }
                                className="text-primary hover:underline"
                              >
                                {log.device_name}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">No Device</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(log.ingested_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {JSON.stringify(log.payload).length} bytes
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewPayload(log)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPayloadDialog} onOpenChange={setShowPayloadDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ingest Payload - Log #{selectedLog?.id}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] w-full">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(selectedLog?.payload, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
