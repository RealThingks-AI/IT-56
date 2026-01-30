import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, FileCheck } from "lucide-react";
import { format } from "date-fns";

const AssetAudit = () => {
  const { organisation } = useOrganisation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["itam-audit-logs", organisation?.id, searchTerm],
    queryFn: async () => {
      if (!organisation?.id) return [];

      const { data, error } = await supabase
        .from("itam_asset_history")
        .select("*, itam_assets(asset_tag, name)")
        .order("performed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!organisation?.id,
  });

  const filteredLogs = auditLogs.filter((log) =>
    searchTerm
      ? log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.itam_assets?.asset_tag.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Audit Trail</h1>
            <p className="text-sm text-muted-foreground">
              Complete history of asset changes
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Audit Logs Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium">TIMESTAMP</TableHead>
                <TableHead className="text-xs font-medium">ASSET</TableHead>
                <TableHead className="text-xs font-medium">ACTION</TableHead>
                <TableHead className="text-xs font-medium">DETAILS</TableHead>
                <TableHead className="text-xs font-medium">PERFORMED BY</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Loading audit logs...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <FileCheck className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No audit logs found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {log.itam_assets?.asset_tag} - {log.itam_assets?.name}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {log.action.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {JSON.stringify(log.details)}
                    </TableCell>
                    <TableCell className="text-sm">{log.performed_by || "System"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AssetAudit;
