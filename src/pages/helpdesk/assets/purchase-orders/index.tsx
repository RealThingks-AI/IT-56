import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Plus, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const PurchaseOrdersList = () => {
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const currencySymbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const currencySymbol = currencySymbols[settings?.currency] || "$";
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["itam-purchase-orders", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("itam_purchase_orders")
        .select("*, itam_vendors(name)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.limit(5000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredPOs = purchaseOrders.filter((po) =>
    searchTerm
      ? po.po_number.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      ordered: "secondary",
      received: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"} className="text-[10px] h-4">{status}</Badge>;
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <Card className="h-full flex flex-col shadow-none border">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b flex-shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search POs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-8 h-8 text-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="outline" className="text-xs h-5 gap-1 flex-shrink-0">
                {filteredPOs.length} POs
              </Badge>
            </div>

            <Button size="sm" className="h-8 text-xs" onClick={() => navigate("/assets/purchase-orders/create-po")}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create PO
            </Button>
          </div>

          {/* Table */}
          <CardContent className="flex-1 min-h-0 overflow-auto p-0">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-medium uppercase tracking-wide">PO Number</TableHead>
                    <TableHead className="text-[10px] font-medium uppercase tracking-wide">Vendor</TableHead>
                    <TableHead className="text-[10px] font-medium uppercase tracking-wide">Total Amount</TableHead>
                    <TableHead className="text-[10px] font-medium uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-[10px] font-medium uppercase tracking-wide">Order Date</TableHead>
                    <TableHead className="text-[10px] font-medium uppercase tracking-wide">Received Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                          <p className="text-xs text-muted-foreground">No purchase orders found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPOs.map((po) => (
                      <TableRow
                        key={po.id}
                        className="cursor-pointer h-9 hover:bg-muted/50"
                        onClick={() => navigate(`/assets/purchase-orders/po-detail/${po.id}`)}
                      >
                        <TableCell className="font-mono text-xs font-medium py-1">{po.po_number}</TableCell>
                        <TableCell className="text-xs py-1">{po.itam_vendors?.name || "—"}</TableCell>
                        <TableCell className="text-xs font-medium py-1">
                          {currencySymbol}{(po.total_amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-1">{getStatusBadge(po.status || "draft")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1">
                          {po.order_date ? format(new Date(po.order_date), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1">
                          {po.received_date ? format(new Date(po.received_date), "MMM d, yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PurchaseOrdersList;
