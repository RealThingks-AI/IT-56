import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Mail, Phone, Globe, MapPin, Edit, Package, Wrench, ShoppingCart } from "lucide-react";
import { getStatusLabel } from "@/lib/assets/assetStatusUtils";

const ASSET_STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  in_use: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-400",
  maintenance: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
  disposed: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400",
  ordered: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-400",
  lost: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-400",
};

const REPAIR_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  open: { color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400", label: "Open" },
  in_progress: { color: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400", label: "In Progress" },
  completed: { color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400", label: "Completed" },
  cancelled: { color: "bg-muted text-muted-foreground", label: "Cancelled" },
};

const VendorDetail = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["itam-vendor-detail", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.from("itam_vendors").select("*").eq("id", vendorId || "").single();
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["itam-vendor-assets", vendorId],
    queryFn: async () => {
      const { data } = await supabase.from("itam_assets").select("*").eq("vendor_id", vendorId || "").eq("is_active", true);
      return data || [];
    },
    enabled: !!vendorId,
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ["itam-vendor-repairs", vendorId],
    queryFn: async () => {
      const { data } = await supabase.from("itam_repairs").select("*, itam_assets(*)").eq("vendor_id", vendorId || "");
      return data || [];
    },
    enabled: !!vendorId,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["itam-vendor-pos", vendorId],
    queryFn: async () => {
      const { data } = await supabase.from("itam_purchase_orders").select("*").eq("vendor_id", vendorId || "");
      return data || [];
    },
    enabled: !!vendorId,
  });

  if (isLoading) {
    return (
      <div className="h-full overflow-auto bg-background p-3 space-y-2.5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="h-full overflow-auto bg-background p-3 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Vendor not found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <h1 className="text-lg font-semibold">{vendor.name}</h1>
              </div>
              <p className="text-xs text-muted-foreground">Vendor Details</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate(`/assets/vendors/edit/${vendor.id}`)}>
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {vendor.contact_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{vendor.contact_name}</span>
                </div>
              )}
              {vendor.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`mailto:${vendor.contact_email}`} className="hover:underline">{vendor.contact_email}</a>
                </div>
              )}
              {vendor.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${vendor.contact_phone}`} className="hover:underline">{vendor.contact_phone}</a>
                </div>
              )}
              {vendor.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{vendor.website}</a>
                </div>
              )}
              {vendor.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <span>{vendor.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Assets</span>
                </div>
                <span className="font-semibold">{assets.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Repairs</span>
                </div>
                <span className="font-semibold">{repairs.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Purchase Orders</span>
                </div>
                <span className="font-semibold">{purchaseOrders.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{vendor.notes || "No notes available"}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="assets" className="w-full">
          <TabsList>
            <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
            <TabsTrigger value="repairs">Repairs ({repairs.length})</TabsTrigger>
            <TabsTrigger value="pos">Purchase Orders ({purchaseOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-1.5">
            {assets.map((asset) => (
              <Card key={asset.id} className="cursor-pointer hover:bg-accent" onClick={() => navigate(`/assets/detail/${asset.asset_tag || asset.id}`)}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-primary">{asset.asset_tag}</p>
                    </div>
                    <Badge variant="outline" className={ASSET_STATUS_COLORS[asset.status] || ""}>{getStatusLabel(asset.status)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {assets.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No assets from this vendor</p>}
          </TabsContent>

          <TabsContent value="repairs" className="space-y-1.5">
            {repairs.map((repair) => {
              const repairStatus = REPAIR_STATUS_CONFIG[repair.status] || { color: "", label: repair.status };
              return (
                <Card key={repair.id} className="cursor-pointer hover:bg-accent" onClick={() => navigate(`/assets/repairs/detail/${repair.id}`)}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium">{repair.issue_description.substring(0, 60)}...</p>
                        <p className="text-xs text-muted-foreground">{repair.itam_assets?.asset_tag} - {repair.itam_assets?.name}</p>
                      </div>
                      <Badge variant="outline" className={repairStatus.color}>{repairStatus.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {repairs.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No repairs with this vendor</p>}
          </TabsContent>

          <TabsContent value="pos" className="space-y-1.5">
            {purchaseOrders.map((po) => (
              <Card key={po.id} className="cursor-pointer hover:bg-accent" onClick={() => navigate(`/assets/purchase-orders/po-detail/${po.id}`)}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{po.po_number}</p>
                      <p className="text-xs text-muted-foreground">₹{(po.total_amount || 0).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline">{(po.status || "draft").charAt(0).toUpperCase() + (po.status || "draft").slice(1)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {purchaseOrders.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No purchase orders with this vendor</p>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendorDetail;
