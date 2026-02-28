import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ContractsTabProps {
  asset: any;
}

export const ContractsTab = ({ asset }: ContractsTabProps) => {
  const navigate = useNavigate();

  // Use vendor from the already-loaded asset relation
  const vendor = asset?.vendor as any;
  const vendorId = asset?.vendor_id;

  // Fallback: if vendor relation is null but vendor_id exists, fetch it
  const { data: fallbackVendor } = useQuery({
    queryKey: ["fallback-vendor", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_vendors")
        .select("id, name")
        .eq("id", vendorId)
        .single();
      return data;
    },
    enabled: !!vendorId && !vendor,
  });

  const resolvedVendor = vendor || fallbackVendor;

  // Fetch purchase orders - only valid columns (no currency column in itam_purchase_orders)
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["asset-purchase-orders", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data, error } = await supabase
        .from("itam_purchase_orders")
        .select("id, po_number, status, total_amount, created_at")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) {
        console.error("PO query error:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!vendorId,
  });

  const customFields = asset?.custom_fields as Record<string, any> | null;
  const contractTerms = customFields?.contract_terms;
  const contractStartDate = customFields?.contract_start_date;
  const contractEndDate = customFields?.contract_end_date;
  const hasContract = contractStartDate || contractEndDate || contractTerms;
  const currencySymbol = (() => {
    const code = customFields?.currency || "INR";
    const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
    return symbols[code] || "₹";
  })();

  const getContractStatus = () => {
    if (!contractEndDate) return null;
    const endDate = new Date(contractEndDate);
    const now = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilEnd < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysUntilEnd <= 30) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Expiring Soon</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Vendor Contract Section */}
      {resolvedVendor ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Vendor Contract</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/assets/vendors/detail/${resolvedVendor.id}`)}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Vendor
              </Button>
            </div>

            {hasContract ? (
              <div className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{resolvedVendor.name}</span>
                  {getContractStatus()}
                </div>

                {(contractStartDate || contractEndDate) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {contractStartDate && format(new Date(contractStartDate), "dd MMM yyyy")}
                    {contractStartDate && contractEndDate && " - "}
                    {contractEndDate && format(new Date(contractEndDate), "dd MMM yyyy")}
                  </div>
                )}

                {contractTerms && (
                  <p className="text-sm text-muted-foreground">{contractTerms}</p>
                )}
              </div>
            ) : (
              <div className="p-3 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  No contract details for {resolvedVendor.name}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => navigate(`/assets/vendors/detail/${resolvedVendor.id}`)}
                >
                  Add contract details
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="text-center py-4">
              <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No vendor linked to this asset</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Purchase Orders */}
      {purchaseOrders.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-medium">Related Purchase Orders</h4>
            <div className="space-y-2">
              {purchaseOrders.map((po: any) => (
                <div
                  key={po.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/assets/purchase-orders/po-detail/${po.id}`)}
                >
                  <div>
                    <span className="font-medium text-sm">{po.po_number}</span>
                    <p className="text-xs text-muted-foreground">
                      {currencySymbol}{po.total_amount?.toLocaleString() ?? "0"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={po.status === "completed" ? "default" : "secondary"}>
                      {po.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {po.created_at && format(new Date(po.created_at), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
