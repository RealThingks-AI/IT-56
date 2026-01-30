import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Settings } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Update {
  kb_number: string;
  title: string;
  severity: string;
  created_at: string;
  affected_devices_count: number;
}

export default function UpdatesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);

      // Fetch pending updates using actual schema columns
      // @ts-ignore - Bypass deep type inference issue
      const { data: pendingData, error } = await supabase
        .from("system_pending_updates")
        .select("id, kb_number, title, severity, created_at, device_id");

      if (error) throw error;

      // Group by KB number and count affected devices
      const updateMap = new Map<string, Update>();

      pendingData?.forEach((item: any) => {
        if (!updateMap.has(item.kb_number)) {
          updateMap.set(item.kb_number, {
            kb_number: item.kb_number,
            title: item.title || "Unknown Update",
            severity: item.severity || "Unknown",
            created_at: item.created_at,
            affected_devices_count: 1,
          });
        } else {
          const existing = updateMap.get(item.kb_number)!;
          existing.affected_devices_count++;
        }
      });

      const updatesArray = Array.from(updateMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setUpdates(updatesArray);
    } catch (error: any) {
      console.error("Error fetching updates:", error);
      toast.error("Failed to load updates");
    } finally {
      setLoading(false);
    }
  };

  const filteredUpdates = updates.filter(
    (update) =>
      update.kb_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/system-updates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Available Updates</h1>
            <p className="text-sm text-muted-foreground">
              Browse KB updates and view affected devices
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/system-updates/settings")} className="h-8 gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>KB Updates Catalog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search updates by KB number or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading updates...</div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KB Number</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>First Detected</TableHead>
                        <TableHead>Affected Devices</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUpdates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No updates found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUpdates.map((update) => (
                          <TableRow
                            key={update.kb_number}
                            className="cursor-pointer hover:bg-accent"
                            onClick={() =>
                              navigate(`/system-updates/update-detail/${update.kb_number}`)
                            }
                          >
                            <TableCell className="font-mono font-medium">
                              {update.kb_number}
                            </TableCell>
                            <TableCell className="max-w-md truncate">{update.title}</TableCell>
                            <TableCell>{getSeverityBadge(update.severity)}</TableCell>
                            <TableCell className="text-sm">
                              {update.created_at ? new Date(update.created_at).toLocaleDateString() : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{update.affected_devices_count}</Badge>
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