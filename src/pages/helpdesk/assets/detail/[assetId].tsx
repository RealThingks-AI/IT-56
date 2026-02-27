import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { CheckOutDialog } from "@/components/helpdesk/assets/CheckOutDialog";
import { CheckInDialog } from "@/components/helpdesk/assets/CheckInDialog";
import { RepairAssetDialog } from "@/components/helpdesk/assets/RepairAssetDialog";
import { MarkAsLostDialog } from "@/components/helpdesk/assets/MarkAsLostDialog";
import { ReplicateAssetDialog } from "@/components/helpdesk/assets/ReplicateAssetDialog";
import { DisposeAssetDialog } from "@/components/helpdesk/assets/DisposeAssetDialog";
import { canCheckIn, canCheckOut } from "@/lib/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

const AssetDetail = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [replicateDialogOpen, setReplicateDialogOpen] = useState(false);
  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Fetch asset details with related data including user lookups
  const { data: asset, isLoading } = useQuery({
    queryKey: ["itam-asset-detail", assetId],
    queryFn: async () => {
      let { data, error } = await supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          department:itam_departments(id, name),
          location:itam_locations(id, name, site:itam_sites(id, name)),
          make:itam_makes(id, name),
          vendor:itam_vendors(id, name)
        `)
        .eq("asset_tag", assetId)
        .maybeSingle();
      
      // Fallback: try querying by id if asset_tag lookup returns null
      if (!data && !error) {
        const { data: byId, error: idError } = await supabase
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
          .maybeSingle();
        if (idError) throw idError;
        if (!byId) return null;
        data = byId;
      }
      if (error) throw error;
      
      // Fetch assigned user separately if assigned_to exists
      let assignedUser = null;
      if (data?.assigned_to) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, name, email")
          .eq("id", data.assigned_to)
          .single();
        assignedUser = userData;
      }
      
      // Fetch checked out user separately if checked_out_to exists
      let checkedOutUser = null;
      if (data?.checked_out_to) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, name, email")
          .eq("id", data.checked_out_to)
          .single();
        checkedOutUser = userData;
      }
      
      return { ...data, assigned_user: assignedUser, checked_out_user: checkedOutUser };
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
        .eq("asset_tag", assetId)
        .single();
      
      if (!currentAsset) return { prev: null, next: null };
      
      // Get previous asset (newer than current)
      const { data: prevAsset } = await supabase
        .from("itam_assets")
        .select("asset_tag")
        .eq("is_active", true)
        .gt("created_at", currentAsset.created_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      
      // Get next asset (older than current)
      const { data: nextAsset } = await supabase
        .from("itam_assets")
        .select("asset_tag")
        .eq("is_active", true)
        .lt("created_at", currentAsset.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      return { prev: prevAsset?.asset_tag || null, next: nextAsset?.asset_tag || null };
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

  // Mutation for updating asset status (only used for dispose now)
  const updateAssetStatus = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ status })
        .eq("id", asset?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllAssetQueries(queryClient);
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_active: false })
        .eq("id", asset?.id);
      if (error) throw error;

      // Log deletion to history
      await supabase.from("itam_asset_history").insert({
        asset_id: asset?.id,
        action: "deleted",
        details: { asset_tag: asset?.asset_tag, asset_name: asset?.name },
        performed_by: currentUser?.id,
      });
    },
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      invalidateAllAssetQueries(queryClient);
      navigate("/assets/allassets");
    },
    onError: (error) => {
      toast.error("Failed to delete asset");
      console.error(error);
    }
  });

  // Invalidate queries helper
  const invalidateQueries = () => {
    invalidateAllAssetQueries(queryClient);
  };

  // Handle action clicks - using dialogs for proper data capture
  const handleAction = (action: string) => {
    switch (action) {
      case "check_in":
        setCheckInDialogOpen(true);
        break;
      case "check_out":
        setCheckOutDialogOpen(true);
        break;
      case "lost":
        setLostDialogOpen(true);
        break;
      case "repair":
        setRepairDialogOpen(true);
        break;
      case "dispose":
        setDisposeDialogOpen(true);
        break;
      case "delete":
        setDeleteConfirmOpen(true);
        break;
      case "replicate":
        setReplicateDialogOpen(true);
        break;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "available": return "default";
      case "in_use": return "secondary";
      case "maintenance": return "destructive";
      case "retired": return "outline";
      case "disposed": return "destructive";
      case "lost": return "outline";
      default: return "secondary";
    }
  };

  // Keyboard shortcuts — disabled when any dialog is open
  const anyDialogOpen = deleteConfirmOpen || imagePreviewOpen || checkOutDialogOpen || checkInDialogOpen || repairDialogOpen || lostDialogOpen || replicateDialogOpen || disposeDialogOpen;
  useKeyboardShortcuts([
    { key: "Escape", callback: () => { if (!anyDialogOpen) navigate("/assets/allassets"); } },
    { key: "ArrowLeft", callback: () => { if (!anyDialogOpen) goToPrev(); } },
    { key: "ArrowRight", callback: () => { if (!anyDialogOpen) goToNext(); } },
    { key: "n", ctrl: true, callback: () => { if (!anyDialogOpen) navigate("/assets/add"); } },
  ]);

  // Currency helper
  const getCurrencySymbol = () => {
    const currency = (asset?.custom_fields as Record<string, any>)?.currency || "INR";
    const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
    return symbols[currency] || "₹";
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Package className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Asset not found</h2>
        <p className="text-sm text-muted-foreground">The asset you're looking for doesn't exist or has been removed.</p>
        <Button variant="outline" onClick={() => navigate("/assets/allassets")}>Back to Assets</Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">

      {/* Header with Title and Action Buttons - Fixed */}
      <div className="shrink-0 flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-lg font-bold">{asset.asset_tag || 'Asset'}</h1>
            <p className="text-xs text-muted-foreground">
              {asset.category?.name || 'Uncategorized'}
              {asset.name && asset.name !== asset.category?.name && ` · ${asset.name}`}
              {asset.department?.name && ` · ${asset.department.name}`}
              {(asset.location?.site?.name || asset.location?.name) && ` · ${asset.location?.site?.name || asset.location?.name}`}
            </p>
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
          <Button variant="outline" size="sm" onClick={() => navigate(`/assets/add?edit=${asset.id}`)} className="gap-1">
            <Edit className="h-4 w-4" />
            Edit Asset
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="gap-1">
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canCheckOut(asset.status) && (
                <DropdownMenuItem onClick={() => handleAction("check_out")}>
                  Check Out
                </DropdownMenuItem>
              )}
              {canCheckIn(asset.status) && (
                <DropdownMenuItem onClick={() => handleAction("check_in")}>
                  Check In
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleAction("repair")}>
                Repair
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("dispose")}>
                Dispose
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("lost")}>
                Mark as Lost
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

      {/* Top Section with Details - Fixed */}
      <div className="shrink-0 px-4 pb-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Asset Photo or Placeholder */}
              <div className="flex-shrink-0">
                {(() => {
                  const customFields = asset.custom_fields as Record<string, any> | null;
                  const photoUrl = customFields?.photo_url;
                  
                  if (photoUrl && !imageError) {
                    return (
                      <div className="relative w-40 h-28 rounded-lg border bg-muted overflow-hidden group">
                        <img 
                          src={photoUrl} 
                          alt={asset.category?.name || 'Asset'} 
                          className="w-full h-full object-cover"
                          onError={() => setImageError(true)}
                        />
                        {/* Zoom button at bottom right */}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute bottom-1 right-1 h-6 w-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                          onClick={() => setImagePreviewOpen(true)}
                        >
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="w-40 h-28 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                      <div className="text-center p-3">
                        <Package className="h-10 w-10 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{asset.model || 'No Image'}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Asset Details - Two Tables */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b">
                        <td className="p-1.5 font-semibold">Asset Tag</td>
                        <td className="p-1.5 font-medium text-primary">{asset.asset_tag || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-1.5 font-semibold">Serial Number</td>
                        <td className="p-1.5">{asset.serial_number || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-1.5 font-semibold">Purchase Date</td>
                        <td className="p-1.5">{asset.purchase_date ? format(new Date(asset.purchase_date), "dd/MM/yyyy") : '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-1.5 font-semibold">Purchase Price</td>
                        <td className="p-1.5 font-semibold">{getCurrencySymbol()}{asset.purchase_price?.toLocaleString() || '0.00'}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-semibold">Model</td>
                        <td className="p-1.5">{asset.model || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b">
                        <td className="p-1.5 font-semibold">Make</td>
                        <td className="p-1.5">{asset.make?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-1.5 font-semibold">Location</td>
                        <td className="p-1.5">{asset.location?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-1.5 font-semibold">Category</td>
                        <td className="p-1.5">{asset.category?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-1.5 font-semibold">Department</td>
                        <td className="p-1.5">{asset.department?.name || '—'}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-semibold">Status</td>
                        <td className="p-1.5">
                          <Badge variant="outline" className={`${getStatusColor(asset.status) === 'default' ? 'bg-green-100 text-green-800' : ''} capitalize text-xs`}>
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
      </div>

      {/* Tabs Section - Fills remaining space with scrollable content */}
      <div className="flex-1 min-h-0 flex flex-col px-4 pb-4">
        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0 w-full overflow-x-auto">
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

          <TabsContent value="details" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <DetailsTab asset={asset} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="warranty" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <WarrantyTab asset={asset} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="events" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <EventsTab assetId={asset.id} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="docs" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <DocsTab assetId={asset.id} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="photos" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <PhotosTab assetId={asset.id} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reserve" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <ReserveTab assetId={asset.id} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="maintenance" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <MaintenanceTab assetId={asset.id} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contracts" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <ContractsTab assetId={asset.id} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="linking" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <LinkingTab assetId={asset.id} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="audit" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <AuditTab assetId={asset.id} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <HistoryTab assetId={String(asset.id)} />
            </ScrollArea>
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

      {/* Asset Action Dialogs */}
      <CheckOutDialog
        open={checkOutDialogOpen}
        onOpenChange={setCheckOutDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <CheckInDialog
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <RepairAssetDialog
        open={repairDialogOpen}
        onOpenChange={setRepairDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <MarkAsLostDialog
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <ReplicateAssetDialog
        open={replicateDialogOpen}
        onOpenChange={setReplicateDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <DisposeAssetDialog
        open={disposeDialogOpen}
        onOpenChange={setDisposeDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
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
