import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Building2, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";

const PODetail = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");

  const { data: po, isLoading } = useQuery({
    queryKey: ["itam-po-detail", poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_purchase_orders")
        .select("*, itam_vendors(*)")
        .eq("id", poId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!poId,
  });

  const updatePO = useMutation({
    mutationFn: async (newStatus: string) => {
      const updates: any = { status: newStatus };
      
      if (newStatus === "ordered" && !po?.order_date) {
        updates.order_date = new Date().toISOString().split('T')[0];
      }
      
      if (newStatus === "received" && !po?.received_date) {
        updates.received_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from("itam_purchase_orders")
        .update(updates)
        .eq("id", poId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itam-po-detail", poId] });
      toast.success("PO status updated");
      setStatus("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update PO");
    },
  });

  const handleStatusUpdate = () => {
    if (!status) {
      toast.error("Please select a status");
      return;
    }
    updatePO.mutate(status);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p>Loading purchase order...</p>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p>Purchase order not found</p>
      </div>
    );
  }

  const getStatusBadge = (s: string) => {
    const variants: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      ordered: "bg-blue-100 text-blue-800",
      received: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return variants[s] || "bg-gray-100 text-gray-800";
  };

  const items = Array.isArray(po.items) ? po.items : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Purchase Order</h1>
                <Badge className={getStatusBadge(po.status || "draft")}>
                  {po.status || "draft"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">PO: {po.po_number}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {po.itam_vendors && (
                <>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{po.itam_vendors.name}</span>
                  </div>
                  {po.itam_vendors.contact_email && (
                    <p className="text-sm text-muted-foreground pl-6">
                      {po.itam_vendors.contact_email}
                    </p>
                  )}
                  {po.itam_vendors.contact_phone && (
                    <p className="text-sm text-muted-foreground pl-6">
                      {po.itam_vendors.contact_phone}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Total Amount</span>
                </div>
                <span className="font-semibold">
                  ₹{(po.total_amount || 0).toLocaleString()}
                </span>
              </div>
              {po.order_date && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Ordered</span>
                  </div>
                  <span>{format(new Date(po.order_date), "MMM dd, yyyy")}</span>
                </div>
              )}
              {po.received_date && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Received</span>
                  </div>
                  <span>{format(new Date(po.received_date), "MMM dd, yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No items in this purchase order
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        ₹{(item.unit_price || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{(po.total_amount || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {po.status !== "received" && po.status !== "cancelled" && (
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {po.status === "draft" && <SelectItem value="ordered">Mark as Ordered</SelectItem>}
                      {po.status === "ordered" && <SelectItem value="received">Mark as Received</SelectItem>}
                      <SelectItem value="cancelled">Cancel PO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleStatusUpdate} 
                disabled={!status || updatePO.isPending}
              >
                {updatePO.isPending ? "Updating..." : "Update Status"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PODetail;
