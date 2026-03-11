import { useState, useMemo, useCallback } from "react";
import { sanitizeSearchInput } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreVertical, Edit, Trash2, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";
import { AddPaymentDialog } from "./AddPaymentDialog";
import { useToast } from "@/hooks/use-toast";
import { formatCost } from "@/lib/subscriptions/subscriptionUtils";
import { SortableTableHeader } from "@/components/helpdesk/SortableTableHeader";
import { useSortableAssets } from "@/hooks/assets/useSortableAssets";

const PAGE_SIZE = 25;

export const PaymentsList = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data: tools } = useQuery({
    queryKey: ["subscriptions-tools-for-filter"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions_tools").select("id, tool_name").order("tool_name");
      return data || [];
    },
  });

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ["subscriptions-payments", searchTerm, statusFilter, toolFilter],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase
        .from("subscriptions_payments")
        .select("*, subscriptions_tools(tool_name)");
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (toolFilter !== "all") query = query.eq("tool_id", toolFilter);
      if (searchTerm) {
        const sanitized = sanitizeSearchInput(searchTerm);
        query = query.or(`invoice_number.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`);
      }
      const { data, error } = await query.order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getColumnValue = useCallback((item: any, column: string): string | number => {
    switch (column) {
      case "tool": return (item.subscriptions_tools as any)?.tool_name || "";
      case "amount": return Number(item.amount || 0);
      case "payment_date": return item.payment_date || "";
      case "status": return item.status || "";
      case "method": return item.payment_method || "";
      case "invoice": return item.invoice_number || "";
      default: return "";
    }
  }, []);

  const { sortedData, sortConfig, handleSort } = useSortableAssets(
    payments || [],
    getColumnValue,
    { initialColumn: "payment_date", initialDirection: null }
  );

  const totalPages = sortedData.length ? Math.ceil(sortedData.length / PAGE_SIZE) : 0;
  const paginatedPayments = sortedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("subscriptions_payments").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete payment", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Payment deleted" });
      refetch();
    }
    setDeleteId(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default", pending: "secondary", failed: "destructive", refunded: "outline",
    };
    return <Badge variant={variants[status] || "default"} className="text-xs capitalize">{status}</Badge>;
  };

  const isFiltered = statusFilter !== "all" || toolFilter !== "all" || !!searchTerm;

  const filteredTotalsByCurrency = useMemo(() => {
    if (!payments) return [];
    const map = new Map<string, number>();
    payments.forEach(p => {
      const c = p.currency || "INR";
      map.set(c, (map.get(c) || 0) + (p.amount || 0));
    });
    return Array.from(map.entries()).map(([currency, total]) => ({ currency, total }));
  }, [payments]);

  return (
    <div className="h-full flex flex-col gap-2 p-3 animate-in fade-in duration-300">
      <div className="shrink-0 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg border">
          <Receipt className="h-4 w-4 text-primary" />
          <div>
            <div className="text-xs font-medium flex items-center gap-1">
              {isFiltered ? "Filtered Total" : "Total Payments"}
              {isFiltered && <span className="text-[10px] text-muted-foreground">(filtered)</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {filteredTotalsByCurrency.map((t, i) => (
                <span key={t.currency}>{i > 0 ? " + " : ""}{formatCost(t.total, t.currency)}</span>
              ))}
              {filteredTotalsByCurrency.length === 0 && "—"}
            </div>
          </div>
        </div>
        <div className="relative w-[200px] ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search payments..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} className="pl-9 h-8" />
        </div>
        {tools && tools.length > 0 && (
          <Select value={toolFilter} onValueChange={v => { setToolFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Tool" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tools</SelectItem>
              {tools.map(t => <SelectItem key={t.id} value={t.id}>{t.tool_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" /> Add Payment
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableTableHeader column="" label="#" sortConfig={{ column: "", direction: null }} onSort={() => {}} className="w-[40px]" />
              <SortableTableHeader column="tool" label="Tool" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="amount" label="Amount" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="payment_date" label="Payment Date" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="status" label="Status" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="method" label="Method" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="invoice" label="Invoice #" sortConfig={sortConfig} onSort={handleSort} />
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
            ) : paginatedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No payments found</p>
                </TableCell>
              </TableRow>
            ) : paginatedPayments.map((payment, index) => (
              <TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-xs text-muted-foreground py-2">{page * PAGE_SIZE + index + 1}</TableCell>
                <TableCell className="font-medium text-sm py-2">{(payment.subscriptions_tools as any)?.tool_name || "N/A"}</TableCell>
                <TableCell className="text-sm font-medium py-2">{formatCost(payment.amount, payment.currency)}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-2">{payment.payment_date ? format(new Date(payment.payment_date), "MMM d, yyyy") : "—"}</TableCell>
                <TableCell className="py-2">{getStatusBadge(payment.status || "pending")}</TableCell>
                <TableCell className="text-xs capitalize py-2">{payment.payment_method?.replace("_", " ") || "—"}</TableCell>
                <TableCell className="text-xs py-2">{payment.invoice_number || "—"}</TableCell>
                <TableCell className="text-right py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingPayment(payment); setIsAddDialogOpen(true); }}>
                        <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteId(payment.id)} className="text-destructive">
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

      <AddPaymentDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setEditingPayment(null); }}
        onSuccess={() => { refetch(); setIsAddDialogOpen(false); setEditingPayment(null); }}
        editingPayment={editingPayment}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Delete Payment?"
        description="This will permanently remove this payment record."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};
