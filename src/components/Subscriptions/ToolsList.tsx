import { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { sanitizeSearchInput } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreVertical, Edit, Trash2, Package, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";
import { AddToolDialog } from "./AddToolDialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatCost, formatCostShort, getDaysUntilRenewal, getRenewalUrgency, getMonthlyEquivalentINR, getAnnualContributionINR, getStatusVariant, SUB_QUERY_KEYS } from "@/lib/subscriptions/subscriptionUtils";
import { SortableTableHeader } from "@/components/helpdesk/SortableTableHeader";
import { useSortableAssets } from "@/hooks/assets/useSortableAssets";
import { PaginationControls } from "@/components/helpdesk/assets/PaginationControls";

const PAGE_SIZE = 25;

export const ToolsList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Record<string, unknown> | null>(null);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tools, isLoading, refetch } = useQuery({
    queryKey: [...SUB_QUERY_KEYS.tools, statusFilter, categoryFilter, typeFilter],
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from("subscriptions_tools")
        .select("*, subscriptions_vendors(name)");

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      if (typeFilter !== "all") query = query.eq("subscription_type", typeFilter);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Client-side search across name, vendor, department, category
  const filteredTools = useMemo(() => {
    if (!tools || !searchTerm) return tools || [];
    const term = sanitizeSearchInput(searchTerm).toLowerCase();
    return tools.filter(t => {
      const name = (t.tool_name || "").toLowerCase();
      const vendor = ((t.subscriptions_vendors as any)?.name || "").toLowerCase();
      const dept = (t.department || "").toLowerCase();
      const cat = (t.category || "").toLowerCase();
      return name.includes(term) || vendor.includes(term) || dept.includes(term) || cat.includes(term);
    });
  }, [tools, searchTerm]);

  const quickStats = useMemo(() => {
    if (!tools) return null;
    const active = tools.filter(t => t.status === "active");
    const monthlyBurn = active.reduce((sum, t) => {
      return sum + getMonthlyEquivalentINR(Number(t.total_cost || 0), t.currency, t.subscription_type);
    }, 0);
    const annualCost = active.reduce((sum, t) => {
      return sum + getAnnualContributionINR(Number(t.total_cost || 0), t.currency, t.subscription_type, (t as any).purchase_date || t.created_at);
    }, 0);
    return { total: tools.length, monthlyBurn, annualCost };
  }, [tools]);

  const getColumnValue = useCallback((item: any, column: string): string | number => {
    switch (column) {
      case "name": return item.tool_name || "";
      case "category": return item.category || "";
      case "type": return item.subscription_type || "";
      case "department": return item.department || "";
      case "qty": return item.quantity || 1;
      case "unit_cost": return Number(item.unit_cost || 0);
      case "total_cost": return Number(item.total_cost || 0);
      case "vendor": return (item.subscriptions_vendors as any)?.name || "";
      case "renewal": return item.renewal_date || "";
      case "status": return item.status || "";
      default: return "";
    }
  }, []);

  const { sortedData, sortConfig, handleSort } = useSortableAssets(
    filteredTools,
    getColumnValue,
    { initialColumn: "name", initialDirection: null }
  );

  const totalPages = sortedData.length ? Math.ceil(sortedData.length / PAGE_SIZE) : 0;
  const paginatedTools = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("subscriptions_tools").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Subscription removed" });
      refetch();
    }
    setDeleteId(null);
  };

  const getStatusBadge = (status: string) => {
    return <Badge variant={getStatusVariant(status)} className="text-xs capitalize">{status.replace("_", " ")}</Badge>;
  };

  const getRenewalBadge = (renewalDate: string | null, subscriptionType?: string | null) => {
    const days = getDaysUntilRenewal(renewalDate);
    if (days === null) return null;
    const urgency = getRenewalUrgency(days, subscriptionType);
    if (days < 0) return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    if (urgency === "critical") return <Badge variant="destructive" className="text-xs">{days}d</Badge>;
    if (urgency === "warning") return <Badge className="text-xs bg-orange-500/10 text-orange-600 border-orange-200">{days}d</Badge>;
    if (urgency === "caution") return <Badge className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-200">{days}d</Badge>;
    return <Badge variant="secondary" className="text-xs">{days}d</Badge>;
  };

  // Portal top-bar into header
  const portalTarget = document.getElementById("module-header-portal");
  const topBarContent = (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="relative w-[220px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search subscriptions..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          className="pl-8 h-7 text-xs"
        />
      </div>

      <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1 h-7 px-3">
        <Plus className="h-3.5 w-3.5" />
        <span className="text-xs">Add Subscription</span>
      </Button>

      <div className="flex items-center gap-1.5 ml-auto">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Software">Software</SelectItem>
            <SelectItem value="Hardware">Hardware</SelectItem>
            <SelectItem value="Cloud Service">Cloud Service</SelectItem>
            <SelectItem value="Security">Security</SelectItem>
            <SelectItem value="Network">Network</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
            <SelectItem value="owned">Owned</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="one_time">One-Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-300">
      {portalTarget ? createPortal(topBarContent, portalTarget) : (
        <div className="shrink-0 px-3 pt-2 pb-1">
          {topBarContent}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto mx-3 rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="hover:bg-transparent">
              <SortableTableHeader column="" label="#" sortConfig={{ column: "", direction: null }} onSort={() => {}} className="w-[40px]" />
              <SortableTableHeader column="name" label="Name" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="category" label="Category" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="type" label="Type" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="department" label="Department" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="qty" label="Qty" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
              <SortableTableHeader column="unit_cost" label="Unit Cost" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
              <SortableTableHeader column="total_cost" label="Total" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
              <SortableTableHeader column="vendor" label="Vendor" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="renewal" label="Renewal" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="status" label="Status" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="" label="" sortConfig={{ column: "", direction: null }} onSort={() => {}} className="text-right w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 12 }).map((_, j) => (
                    <TableCell key={j} className="py-2"><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedTools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No subscriptions found</p>
                </TableCell>
              </TableRow>
            ) : paginatedTools.map((tool, index) => (
              <TableRow
                key={tool.id}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/subscription/detail/${tool.id}`)}
              >
                <TableCell className="text-xs text-muted-foreground py-2">{(page - 1) * PAGE_SIZE + index + 1}</TableCell>
                <TableCell className="font-medium text-xs py-2">{tool.tool_name}</TableCell>
                <TableCell className="py-2">
                  {tool.category ? <Badge variant="outline" className="text-xs">{tool.category}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-xs capitalize py-2">{tool.subscription_type?.replace("_", " ") || "—"}</TableCell>
                <TableCell className="text-xs py-2">{tool.department || "—"}</TableCell>
                <TableCell className="text-xs text-right py-2">{tool.quantity || 1}</TableCell>
                <TableCell className="text-xs text-right py-2">{formatCost(tool.unit_cost, tool.currency)}</TableCell>
                <TableCell className="text-xs font-medium text-right py-2">{formatCost(tool.total_cost, tool.currency)}</TableCell>
                <TableCell className="text-xs py-2">{(tool.subscriptions_vendors as any)?.name || "—"}</TableCell>
                <TableCell className="py-2">
                  {tool.renewal_date ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{format(new Date(tool.renewal_date), "MMM d, yyyy")}</span>
                      {getRenewalBadge(tool.renewal_date, tool.subscription_type)}
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell className="py-2">{getStatusBadge(tool.status || "active")}</TableCell>
                <TableCell className="text-right py-2" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/subscription/detail/${tool.id}`)}>
                        <Eye className="h-3.5 w-3.5 mr-2" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setEditingTool(tool as any); setIsAddDialogOpen(true); }}>
                        <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(tool.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer: pagination + stats */}
      <div className="shrink-0 px-3 py-2 flex items-center justify-between">
        {quickStats && tools && tools.length > 0 ? (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Total: <strong className="text-foreground">{quickStats.total}</strong></span>
            <span>MRC: <strong className="text-foreground">{formatCostShort(quickStats.monthlyBurn, "INR")}</strong></span>
            <span>Annual: <strong className="text-foreground">{formatCostShort(quickStats.annualCost, "INR")}</strong></span>
          </div>
        ) : <div />}

        <PaginationControls currentPage={page} totalPages={totalPages} totalItems={sortedData.length} itemsPerPage={PAGE_SIZE} onPageChange={setPage} />
      </div>

      <AddToolDialog
        open={isAddDialogOpen}
        onOpenChange={open => { setIsAddDialogOpen(open); if (!open) setEditingTool(null); }}
        onSuccess={() => { refetch(); setEditingTool(null); }}
        editingTool={editingTool as any}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Delete Subscription?"
        description="This will permanently remove this subscription and cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};
