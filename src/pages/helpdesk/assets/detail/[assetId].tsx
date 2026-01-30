import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, ChevronLeft, ChevronRight, Package, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { DetailsTab } from "./[assetId]/tabs/DetailsTab";
import { WarrantyTab } from "./[assetId]/tabs/WarrantyTab";
import { HistoryTab } from "./[assetId]/tabs/HistoryTab";
import { LinkingTab } from "./[assetId]/tabs/LinkingTab";
import { MaintenanceTab } from "./[assetId]/tabs/MaintenanceTab";
import { AuditTab } from "./[assetId]/tabs/AuditTab";
import { EventsTab } from "./[assetId]/tabs/EventsTab";
import { DocsTab } from "./[assetId]/tabs/DocsTab";
import { PhotosTab } from "./[assetId]/tabs/PhotosTab";
import { ReserveTab } from "./[assetId]/tabs/ReserveTab";
import { ContractsTab } from "./[assetId]/tabs/ContractsTab";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const AssetDetail = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  // Fetch asset details with related data
  const { data: asset, isLoading } = useQuery({
    queryKey: ["itam-asset-detail", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          department:itam_departments(id, name),
          location:itam_locations(id, name, site:itam_sites(id, name)),
          make:itam_makes(id, name),
          vendor:itam_vendors(id, name)
        `)
        .eq("id", assetId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!assetId
  });

  // Fetch adjacent assets for navigation (optimized - only get prev/next)
  const { data: adjacentAssets } = useQuery({
    queryKey: ["adjacent-assets", assetId],
    queryFn: async () => {
      // Get current asset's created_at for cursor-based navigation
      const { data: currentAsset } = await supabase
        .from("itam_assets")
        .select("created_at")
        .eq("id", assetId)
        .single();
      
      if (!currentAsset) return { prev: null, next: null };
      
      // Get previous asset (newer than current)
      const { data: prevAsset } = await supabase
        .from("itam_assets")
        .select("id")
        .eq("is_active", true)
        .gt("created_at", currentAsset.created_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      
      // Get next asset (older than current)
      const { data: nextAsset } = await supabase
        .from("itam_assets")
        .select("id")
        .eq("is_active", true)
        .lt("created_at", currentAsset.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      return { prev: prevAsset?.id || null, next: nextAsset?.id || null };
    },
    enabled: !!assetId
  });

  const hasPrev = !!adjacentAssets?.prev;
  const hasNext = !!adjacentAssets?.next;

  const goToPrev = () => {
    if (hasPrev && adjacentAssets?.prev) {
      navigate(`/assets/detail/${adjacentAssets.prev}`);
    }
  };

  const goToNext = () => {
    if (hasNext && adjacentAssets?.next) {
      navigate(`/assets/detail/${adjacentAssets.next}`);
    }
  };

  // Mutation for updating asset status
  const updateAssetStatus = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ status })
        .eq("id", assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itam-asset-detail", assetId] });
      toast.success("Asset status updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update asset status");
      console.error(error);
    }
  });

  // Mutation for soft-deleting asset
  const deleteAsset = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_active: false })
        .eq("id", assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      navigate("/assets/allassets");
    },
    onError: (error) => {
      toast.error("Failed to delete asset");
      console.error(error);
    }
  });

  // Mutation for replicating asset
  const replicateAsset = useMutation({
    mutationFn: async () => {
      const { data: assetData, error: fetchError } = await supabase
        .from("itam_assets")
        .select("*")
        .eq("id", assetId)
        .single();
      if (fetchError) throw fetchError;

      const { id, created_at, updated_at, asset_id: assetIdField, asset_tag, ...assetToCopy } = assetData;
      
      const { data, error } = await supabase
        .from("itam_assets")
        .insert({
          ...assetToCopy,
          name: `${assetToCopy.name || 'Asset'} (Copy)`,
          asset_id: `${assetIdField}-COPY-${Date.now()}`,
          asset_tag: asset_tag ? `${asset_tag}-COPY` : null
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Asset replicated successfully");
      navigate(`/assets/detail/${data.id}`);
    },
    onError: (error) => {
      toast.error("Failed to replicate asset");
      console.error(error);
    }
  });

  // Handle action clicks
  const handleAction = (action: string) => {
    switch (action) {
      case "check_in":
        updateAssetStatus.mutate({ status: "available" });
        break;
      case "check_out":
        updateAssetStatus.mutate({ status: "in_use" });
        break;
      case "lost":
        updateAssetStatus.mutate({ status: "lost" });
        break;
      case "repair":
        updateAssetStatus.mutate({ status: "maintenance" });
        break;
      case "dispose":
        updateAssetStatus.mutate({ status: "disposed" });
        break;
      case "delete":
        setDeleteConfirmOpen(true);
        break;
      case "replicate":
        replicateAsset.mutate();
        break;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "available": return "default";
      case "in_use": return "secondary";
      case "maintenance": return "destructive";
      case "retired": return "outline";
      default: return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading asset details...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Asset not found</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="h-full space-y-4 p-4">
        {/* Header with Title and Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-lg font-bold">{asset.category?.name || 'Asset'}</h1>
              <p className="text-xs text-muted-foreground">{asset.asset_id || asset.asset_tag || 'No ID'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Navigation Buttons */}
            <Button variant="outline" size="sm" onClick={goToPrev} disabled={!hasPrev} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button variant="outline" size="sm" onClick={goToNext} disabled={!hasNext} className="gap-1">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Edit Asset Button */}
            <Button variant="outline" size="sm" onClick={() => navigate(`/assets/add?edit=${assetId}`)} className="gap-1">
              <Edit className="h-4 w-4" />
              Edit Asset
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-1 bg-green-600 hover:bg-green-700">
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {asset.status === "available" ? (
                  <DropdownMenuItem onClick={() => handleAction("check_out")}>
                    Check Out
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleAction("check_in")}>
                    Check In
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleAction("repair")}>
                  Repair / Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction("lost")}>
                  Mark as Lost
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction("dispose")}>
                  Dispose
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction("delete")} className="text-red-600">
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction("replicate")}>
                  Replicate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Top Section with Details */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Asset Photo or Placeholder */}
              <div className="flex-shrink-0">
                {(() => {
                  const customFields = asset.custom_fields as Record<string, any> | null;
                  const photoUrl = customFields?.photo_url;
                  
                  if (photoUrl) {
                    return (
                      <div className="relative w-48 h-36 rounded-lg border bg-muted overflow-hidden group">
                        <img 
                          src={photoUrl} 
                          alt={asset.category?.name || 'Asset'} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center">
                                <div class="text-center p-4">
                                  <svg class="h-12 w-12 mx-auto mb-2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>
                                  <p class="text-sm text-muted-foreground">Image failed</p>
                                </div>
                              </div>
                            `;
                          }}
                        />
                        {/* Zoom button at bottom right */}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute bottom-2 right-2 h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                          onClick={() => setImagePreviewOpen(true)}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="w-48 h-36 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                      <div className="text-center p-4">
                        <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{asset.model || 'No Image'}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Asset Details - Two Tables */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 text-sm font-semibold">Asset ID</td>
                        <td className="p-2 text-sm font-medium text-primary">{asset.asset_id || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 text-sm font-semibold">Asset Tag</td>
                        <td className="p-2 text-sm">{asset.asset_tag || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 text-sm font-semibold">Purchase Date</td>
                        <td className="p-2 text-sm">{asset.purchase_date ? format(new Date(asset.purchase_date), "dd/MM/yyyy") : '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 text-sm font-semibold">Purchase Price</td>
                        <td className="p-2 text-sm font-semibold">₹{asset.purchase_price?.toLocaleString() || '0.00'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-sm font-semibold">Model</td>
                        <td className="p-2 text-sm">{asset.model || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 text-sm font-semibold">Make</td>
                        <td className="p-2 text-sm">{asset.make?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 text-sm font-semibold">Location</td>
                        <td className="p-2 text-sm">{asset.location?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 text-sm font-semibold">Category</td>
                        <td className="p-2 text-sm">{asset.category?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 text-sm font-semibold">Department</td>
                        <td className="p-2 text-sm">{asset.department?.name || '—'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-sm font-semibold">Status</td>
                        <td className="p-2 text-sm">
                          <Badge variant="outline" className={`${getStatusColor(asset.status) === 'default' ? 'bg-green-100 text-green-800' : ''} capitalize`}>
                            {asset.status === 'in_use' ? 'Checked out' : asset.status || 'available'}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="warranty">Warranty</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="docs">Documents</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="reserve">Reservations</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="linking">Linking</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-3">
            <DetailsTab asset={asset} />
          </TabsContent>

          <TabsContent value="warranty" className="mt-3">
            <WarrantyTab asset={asset} />
          </TabsContent>

          <TabsContent value="events" className="mt-3">
            <EventsTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="docs" className="mt-3">
            <DocsTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="photos" className="mt-3">
            <PhotosTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="reserve" className="mt-3">
            <ReserveTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="maintenance" className="mt-3">
            <MaintenanceTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="contracts" className="mt-3">
            <ContractsTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="linking" className="mt-3">
            <LinkingTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="audit" className="mt-3">
            <AuditTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            <HistoryTab assetId={String(asset.id)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => deleteAsset.mutate()}
      />

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              {asset.category?.name || 'Asset'} - {asset.asset_id || asset.asset_tag || 'Photo'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {(() => {
              const customFields = asset.custom_fields as Record<string, any> | null;
              const photoUrl = customFields?.photo_url;
              return photoUrl ? (
                <img
                  src={photoUrl}
                  alt={asset.category?.name || 'Asset'}
                  className="max-h-[70vh] w-auto rounded-lg object-contain"
                />
              ) : null;
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetDetail;
