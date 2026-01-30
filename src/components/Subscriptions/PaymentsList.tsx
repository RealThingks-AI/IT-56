import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreVertical, Edit, Trash2, Receipt } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AddPaymentDialog } from "./AddPaymentDialog";
import { useToast } from "@/hooks/use-toast";
import { convertToINR, formatINR } from "@/lib/currencyConversion";

export const PaymentsList = () => {
  const { organisation } = useOrganisation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ["subscriptions-payments", organisation?.id, searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("subscriptions_payments")
        .select(`
          *,
          subscriptions_tools(tool_name)
        `)
        .eq("organisation_id", organisation?.id!);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.order("payment_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organisation?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!organisation?.id) return;

    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions_payments',
          filter: `organisation_id=eq.${organisation.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["subscriptions-payments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organisation?.id, queryClient]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("subscriptions_payments")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
      refetch();
    }
  };

  const handleEdit = (payment: any) => {
    setEditingPayment(payment);
    setIsAddDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingPayment(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      failed: "destructive",
      refunded: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  // Calculate total in INR
  const totalInINR = payments?.reduce((sum, payment) => {
    const amountInINR = convertToINR(payment.amount, payment.currency || "INR");
    return sum + amountInINR;
  }, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Summary Bar */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border">
        <Receipt className="h-4 w-4 text-primary" />
        <div>
          <div className="text-sm font-medium">Total Payments</div>
          <div className="text-xs text-muted-foreground">{formatINR(totalInINR)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-sm">Add Payment</span>
          </Button>
        </div>
      </div>

      {!payments || payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
          <div className="rounded-full bg-muted p-4 mb-3">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No payments found</h3>
          <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
            Get started by adding your first payment
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium h-9">TOOL</TableHead>
                <TableHead className="text-xs font-medium h-9">AMOUNT</TableHead>
                <TableHead className="text-xs font-medium h-9">PAYMENT DATE</TableHead>
                <TableHead className="text-xs font-medium h-9">STATUS</TableHead>
                <TableHead className="text-xs font-medium h-9">METHOD</TableHead>
                <TableHead className="text-xs font-medium h-9">INVOICE #</TableHead>
                <TableHead className="text-xs font-medium h-9 text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const amountInINR = convertToINR(payment.amount, payment.currency || "INR");
                return (
                  <TableRow key={payment.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-sm py-2">
                      {payment.subscriptions_tools?.tool_name || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm font-medium py-2">
                      {formatINR(amountInINR)}
                      {payment.currency !== "INR" && (
                        <span className="text-xs text-muted-foreground block">
                          ({payment.amount} {payment.currency})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">
                      {payment.payment_date
                        ? format(new Date(payment.payment_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="py-2">{getStatusBadge(payment.status || "pending")}</TableCell>
                    <TableCell className="text-xs capitalize py-2">
                      {payment.payment_method?.replace("_", " ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      {payment.invoice_number || "—"}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(payment)}>
                            <Edit className="h-3.5 w-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(payment.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
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
      )}

      <AddPaymentDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={() => {
          refetch();
          handleDialogClose();
        }}
        editingPayment={editingPayment}
      />
    </div>
  );
};