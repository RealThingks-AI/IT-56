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
import { Search, Plus, FileText } from "lucide-react";
import { format } from "date-fns";

const PurchaseOrdersList = () => {
  const navigate = useNavigate();
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

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
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
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold">Purchase Orders</h1>
              <p className="text-sm text-muted-foreground">{filteredPOs.length} POs</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate("/assets/purchase-orders/create-po")}>
            <Plus className="h-4 w-4 mr-2" />
            Create PO
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search POs..."
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* PO Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium">PO NUMBER</TableHead>
                <TableHead className="text-xs font-medium">VENDOR</TableHead>
                <TableHead className="text-xs font-medium">TOTAL AMOUNT</TableHead>
                <TableHead className="text-xs font-medium">STATUS</TableHead>
                <TableHead className="text-xs font-medium">ORDER DATE</TableHead>
                <TableHead className="text-xs font-medium">RECEIVED DATE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Loading purchase orders...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No purchase orders found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow
                    key={po.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/assets/purchase-orders/po-detail/${po.id}`)}
                  >
                    <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                    <TableCell className="text-sm">{po.itam_vendors?.name || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">
                      ₹{(po.total_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status || "draft")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {po.order_date
                        ? format(new Date(po.order_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {po.received_date
                        ? format(new Date(po.received_date), "MMM d, yyyy")
                        : "—"}
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

export default PurchaseOrdersList;
