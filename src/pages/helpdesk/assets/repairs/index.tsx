import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Wrench } from "lucide-react";
import { format } from "date-fns";

const RepairsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: repairs = [], isLoading } = useQuery({
    queryKey: ["itam-repairs-list", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("itam_repairs")
        .select("*, itam_assets(asset_tag, name), itam_vendors(name)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredRepairs = repairs.filter((repair) =>
    searchTerm
      ? repair.repair_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.issue_description.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "secondary",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status?.replace("_", " ") || "unknown"}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold">Repairs & Maintenance</h1>
              <p className="text-sm text-muted-foreground">
                {filteredRepairs.length} repair records
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate("/assets/repairs/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Repair
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search repairs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Repairs Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium">REPAIR #</TableHead>
                <TableHead className="text-xs font-medium">ASSET</TableHead>
                <TableHead className="text-xs font-medium">ISSUE</TableHead>
                <TableHead className="text-xs font-medium">VENDOR</TableHead>
                <TableHead className="text-xs font-medium">STATUS</TableHead>
                <TableHead className="text-xs font-medium">COST</TableHead>
                <TableHead className="text-xs font-medium">CREATED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Loading repairs...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRepairs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Wrench className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No repair records found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRepairs.map((repair) => (
                  <TableRow
                    key={repair.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/assets/repairs/detail/${repair.id}`)}
                  >
                    <TableCell className="font-mono text-sm">
                      {repair.repair_number || `R-${repair.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {repair.itam_assets?.asset_tag} - {repair.itam_assets?.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {repair.issue_description.substring(0, 50)}...
                    </TableCell>
                    <TableCell className="text-sm">{repair.itam_vendors?.name || "—"}</TableCell>
                    <TableCell>{getStatusBadge(repair.status || "open")}</TableCell>
                    <TableCell className="text-sm">
                      {repair.cost
                        ? `INR ${repair.cost.toLocaleString()}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {repair.created_at ? format(new Date(repair.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
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

export default RepairsList;
