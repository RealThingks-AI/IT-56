import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Mail, Phone, Globe, MapPin, Edit, Package, Wrench, ShoppingCart } from "lucide-react";

const VendorDetail = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["itam-vendor-detail", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_vendors")
        .select("*")
        .eq("id", vendorId || "")
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["itam-vendor-assets", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("*")
        .eq("vendor_id", vendorId || "")
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!vendorId,
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ["itam-vendor-repairs", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_repairs")
        .select("*, itam_assets(*)")
        .eq("vendor_id", vendorId || "");
      return data || [];
    },
    enabled: !!vendorId,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["itam-vendor-pos", vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_purchase_orders")
        .select("*")
        .eq("vendor_id", vendorId || "");
      return data || [];
    },
    enabled: !!vendorId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p>Loading vendor details...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p>Vendor not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6" />
                <h1 className="text-2xl font-bold">{vendor.name}</h1>
              </div>
              <p className="text-sm text-muted-foreground">Vendor Details</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/assets/vendors/edit/${vendor.id}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Vendor
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vendor.contact_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{vendor.contact_name}</span>
                </div>
              )}
              {vendor.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${vendor.contact_email}`} className="text-sm hover:underline">
                    {vendor.contact_email}
                  </a>
                </div>
              )}
              {vendor.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${vendor.contact_phone}`} className="text-sm hover:underline">
                    {vendor.contact_phone}
                  </a>
                </div>
              )}
              {vendor.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={vendor.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    {vendor.website}
                  </a>
                </div>
              )}
              {vendor.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{vendor.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Assets</span>
                </div>
                <span className="font-semibold">{assets.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Repairs</span>
                </div>
                <span className="font-semibold">{repairs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Purchase Orders</span>
                </div>
                <span className="font-semibold">{purchaseOrders.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {vendor.notes || "No notes available"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="assets" className="w-full">
          <TabsList>
            <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
            <TabsTrigger value="repairs">Repairs ({repairs.length})</TabsTrigger>
            <TabsTrigger value="pos">Purchase Orders ({purchaseOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-3">
            {assets.map((asset) => (
              <Card 
                key={asset.id} 
                className="cursor-pointer hover:bg-accent"
                onClick={() => navigate(`/assets/detail/${asset.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-sm text-muted-foreground">{asset.asset_tag}</p>
                    </div>
                    <span className="text-sm">{asset.status}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {assets.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No assets from this vendor</p>
            )}
          </TabsContent>

          <TabsContent value="repairs" className="space-y-3">
            {repairs.map((repair) => (
              <Card 
                key={repair.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => navigate(`/assets/repairs/detail/${repair.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{repair.issue_description.substring(0, 60)}...</p>
                      <p className="text-sm text-muted-foreground">
                        {repair.itam_assets?.asset_tag} - {repair.itam_assets?.name}
                      </p>
                    </div>
                    <span className="text-sm">{repair.status}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {repairs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No repairs with this vendor</p>
            )}
          </TabsContent>

          <TabsContent value="pos" className="space-y-3">
            {purchaseOrders.map((po) => (
              <Card 
                key={po.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => navigate(`/assets/purchase-orders/po-detail/${po.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{po.po_number}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{(po.total_amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-sm">{po.status}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {purchaseOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No purchase orders with this vendor</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendorDetail;
