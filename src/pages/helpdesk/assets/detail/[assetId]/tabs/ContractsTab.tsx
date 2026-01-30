import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ContractsTabProps {
  assetId: string;
}

export const ContractsTab = ({ assetId }: ContractsTabProps) => {
  const navigate = useNavigate();

  // Fetch asset to get vendor info
  const { data: asset } = useQuery({
    queryKey: ["asset-for-contracts", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_assets")
        .select(`
          id,
          vendor_id,
          vendor:itam_vendors(id, name, contract_terms, contract_start_date, contract_end_date)
        `)
        .eq("id", assetId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!assetId,
  });

  // Fetch purchase orders related to this asset's vendor
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["asset-purchase-orders", asset?.vendor_id],
    queryFn: async () => {
      if (!asset?.vendor_id) return [];
      
      const { data, error } = await supabase
        .from("itam_purchase_orders")
        .select("id, po_number, status, total_amount, currency, created_at")
        .eq("vendor_id", asset.vendor_id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!asset?.vendor_id,
  });

  const vendor = asset?.vendor as any;
  const hasContract = vendor?.contract_start_date || vendor?.contract_end_date || vendor?.contract_terms;

  const getContractStatus = () => {
    if (!vendor?.contract_end_date) return null;
    
    const endDate = new Date(vendor.contract_end_date);
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
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Vendor Contract Section */}
          {vendor ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Vendor Contract</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/assets/vendors/detail/${vendor.id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Vendor
                </Button>
              </div>
              
              {hasContract ? (
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{vendor.name}</span>
                    {getContractStatus()}
                  </div>
                  
                  {(vendor.contract_start_date || vendor.contract_end_date) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {vendor.contract_start_date && format(new Date(vendor.contract_start_date), "dd MMM yyyy")}
                      {vendor.contract_start_date && vendor.contract_end_date && " - "}
                      {vendor.contract_end_date && format(new Date(vendor.contract_end_date), "dd MMM yyyy")}
                    </div>
                  )}
                  
                  {vendor.contract_terms && (
                    <p className="text-sm text-muted-foreground">{vendor.contract_terms}</p>
                  )}
                </div>
              ) : (
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    No contract details for {vendor.name}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1"
                    onClick={() => navigate(`/assets/vendors/detail/${vendor.id}`)}
                  >
                    Add contract details
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No vendor linked to this asset</p>
            </div>
          )}

          {/* Related Purchase Orders */}
          {purchaseOrders.length > 0 && (
            <div className="space-y-3">
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
                        {po.currency} {po.total_amount?.toLocaleString()}
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
            </div>
          )}

          {!vendor && purchaseOrders.length === 0 && (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No contracts linked to this asset</p>
              <p className="text-xs text-muted-foreground mt-1">
                Link a vendor to see contract information
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};