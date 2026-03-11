import { useState, useMemo, useCallback } from "react";
import { sanitizeSearchInput } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreVertical, Edit, Trash2, Key, ChevronLeft, ChevronRight, Users, CheckCircle, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";
import { AddLicenseDialog } from "./AddLicenseDialog";
import { useToast } from "@/hooks/use-toast";
import { SortableTableHeader } from "@/components/helpdesk/SortableTableHeader";
import { useSortableAssets } from "@/hooks/assets/useSortableAssets";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export const LicensesList = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data: licenses, isLoading, refetch } = useQuery({
    queryKey: ["subscriptions-licenses", statusFilter],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase
        .from("subscriptions_licenses")
        .select("*, subscriptions_tools(tool_name)");
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!licenses) return null;
    const total = licenses.length;
    const assigned = licenses.filter(l => l.status === "assigned").length;
    const available = licenses.filter(l => l.status === "available").length;
    const expiring = licenses.filter(l => {
      if (!l.expires_at) return false;
      const days = Math.ceil((new Date(l.expires_at).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 30;
    }).length;
    return { total, assigned, available, expiring };
  }, [licenses]);

  const filteredLicenses = useMemo(() => {
    if (!licenses || !searchTerm) return licenses || [];
    const term = sanitizeSearchInput(searchTerm).toLowerCase();
    return licenses.filter(l => {
      const toolName = (l.subscriptions_tools as any)?.tool_name || "";
      const assignedTo = l.assigned_to_name || l.assigned_to_email || l.assigned_to || "";
      const key = l.license_key || "";
      return toolName.toLowerCase().includes(term) || assignedTo.toLowerCase().includes(term) || key.toLowerCase().includes(term);
    });
  }, [licenses, searchTerm]);

  const getColumnValue = useCallback((item: any, column: string): string | number => {
    switch (column) {
      case "tool": return (item.subscriptions_tools as any)?.tool_name || "";
      case "license_key": return item.license_key || "";
      case "status": return item.status || "";
      case "assigned_to": return item.assigned_to_name || item.assigned_to_email || item.assigned_to || "";
      case "assigned_at": return item.assigned_at || "";
      case "expires_at": return item.expires_at || "";
      default: return "";
    }
  }, []);

  const { sortedData, sortConfig, handleSort } = useSortableAssets(
    filteredLicenses,
    getColumnValue,
    { initialColumn: "tool", initialDirection: null }
  );

  const totalPages = sortedData.length ? Math.ceil(sortedData.length / PAGE_SIZE) : 0;
  const paginatedLicenses = sortedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("subscriptions_licenses").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete license", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "License deleted" });
      refetch();
    }
    setDeleteId(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "secondary", assigned: "default", expired: "destructive", revoked: "outline",
    };
    return <Badge variant={variants[status] || "default"} className="text-xs capitalize">{status}</Badge>;
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  };

  const getRowClass = (license: any) => {
    if (license.status === "expired") return "bg-destructive/5 hover:bg-destructive/10";
    const days = getDaysUntilExpiry(license.expires_at);
    if (days !== null && days <= 7 && days >= 0) return "bg-destructive/5 hover:bg-destructive/10";
    if (days !== null && days <= 30 && days >= 0) return "bg-orange-500/5 hover:bg-orange-500/10";
    return "hover:bg-muted/50";
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3 animate-in fade-in duration-300">
      {/* Stat Cards */}
      {stats && (
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Total", value: stats.total, icon: Key, color: "text-primary" },
            { label: "Assigned", value: stats.assigned, icon: Users, color: "text-emerald-600" },
            { label: "Available", value: stats.available, icon: CheckCircle, color: "text-blue-600" },
            { label: "Expiring ≤30d", value: stats.expiring, icon: Clock, color: "text-orange-600" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card">
              <s.icon className={cn("h-4 w-4 shrink-0", s.color)} />
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-sm font-semibold">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="shrink-0 flex items-center gap-2 flex-wrap">
        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search licenses, tools, users..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} className="pl-9 h-8" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" /> Add License
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableTableHeader column="" label="#" sortConfig={{ column: "", direction: null }} onSort={() => {}} className="w-[40px]" />
              <SortableTableHeader column="tool" label="Tool" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="license_key" label="License Key" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="status" label="Status" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="assigned_to" label="Assigned To" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="assigned_at" label="Assigned Date" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="expires_at" label="Expiry" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="" label="" sortConfig={{ column: "", direction: null }} onSort={() => {}} className="text-right w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j} className="py-2"><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedLicenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No licenses found</p>
                </TableCell>
              </TableRow>
            ) : paginatedLicenses.map((license, index) => {
              const daysUntilExpiry = getDaysUntilExpiry(license.expires_at);
              return (
                <TableRow key={license.id} className={cn("transition-colors", getRowClass(license))}>
                  <TableCell className="text-xs text-muted-foreground py-2">{page * PAGE_SIZE + index + 1}</TableCell>
                  <TableCell className="font-medium text-sm py-2">{(license.subscriptions_tools as any)?.tool_name || "N/A"}</TableCell>
                  <TableCell className="font-mono text-xs py-2">{license.license_key || "—"}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(license.status || "available")}
                      {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
                        <Badge variant={daysUntilExpiry <= 7 ? "destructive" : "outline"} className="text-[10px] px-1">
                          {daysUntilExpiry}d
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm py-2">
                    <div className="flex flex-col">
                      <span>{license.assigned_to_name || license.assigned_to_email || (license.assigned_to ? "User assigned" : "—")}</span>
                      {license.assigned_to_name && license.assigned_to_email && (
                        <span className="text-xs text-muted-foreground">{license.assigned_to_email}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">{license.assigned_at ? format(new Date(license.assigned_at), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">{license.expires_at ? format(new Date(license.expires_at), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell className="text-right py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingLicense(license); setIsAddDialogOpen(true); }}>
                          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(license.id)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page + 1} of {totalPages} ({sortedData.length} total)</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AddLicenseDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setEditingLicense(null); }}
        onSuccess={() => { refetch(); setIsAddDialogOpen(false); setEditingLicense(null); }}
        editingLicense={editingLicense}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Delete License?"
        description="This will permanently remove this license record."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};
