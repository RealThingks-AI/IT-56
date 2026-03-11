import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/tickets/useKeyboardShortcuts";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// ScrollArea removed - tabs use overflow-y-auto directly
import { Edit, ChevronLeft, ChevronRight, Package, ZoomIn, ShieldCheck, CheckCircle2, XCircle, Clock, Minus, EyeOff } from "lucide-react";
import { differenceInDays } from "date-fns";
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

import { ContractsTab } from "./[assetId]/tabs/ContractsTab";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CheckOutDialog } from "@/components/helpdesk/assets/CheckOutDialog";
import { CheckInDialog } from "@/components/helpdesk/assets/CheckInDialog";
import { RepairAssetDialog } from "@/components/helpdesk/assets/RepairAssetDialog";
import { ReplicateAssetDialog } from "@/components/helpdesk/assets/ReplicateAssetDialog";
import { DisposeAssetDialog } from "@/components/helpdesk/assets/DisposeAssetDialog";
import { ReassignAssetDialog } from "@/components/helpdesk/assets/ReassignAssetDialog";
import { canCheckIn, canCheckOut, getStatusLabel, getStatusBadgeColor, ASSET_STATUS } from "@/lib/assets/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";

const AssetDetail = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [replicateDialogOpen, setReplicateDialogOpen] = useState(false);
  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error when navigating between assets via Prev/Next
  useEffect(() => {
    setImageError(false);
  }, [assetId]);

  // Fetch asset details with related data including user lookups
  const { data: asset, isLoading } = useQuery({
    queryKey: ["itam-asset-detail", assetId],
    queryFn: async () => {
      const selectFields = `
          *,
          category:itam_categories(id, name),
          department:itam_departments(id, name),
          location:itam_locations(id, name, site:itam_sites(id, name)),
          make:itam_makes(id, name),
          vendor:itam_vendors(id, name)
        `;

      // Single OR query instead of sequential fallback lookups
      const sanitizedId = assetId!.replace(/[",\\()]/g, "");
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sanitizedId);
      
      let orFilter = `asset_tag.eq.${sanitizedId},asset_id.eq.${sanitizedId}`;
      if (isUuid) orFilter += `,id.eq.${sanitizedId}`;

      const { data, error } = await supabase
        .from("itam_assets")
        .select(selectFields)
        .or(orFilter)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
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
        .select("created_at, asset_tag, asset_id")
        .or(`asset_tag.eq.${assetId!.replace(/[",\\()]/g, "")},asset_id.eq.${assetId!.replace(/[",\\()]/g, "")}`)
        .maybeSingle();
      
      if (!currentAsset) return { prev: null, next: null };
      
      // Get previous asset (newer than current)
      const { data: prevAsset } = await supabase
        .from("itam_assets")
        .select("asset_tag, asset_id")
        .eq("is_active", true)
        .eq("is_hidden", false)
        .gt("created_at", currentAsset.created_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      // Get next asset (older than current)
      const { data: nextAsset } = await supabase
        .from("itam_assets")
        .select("asset_tag, asset_id")
        .eq("is_active", true)
        .eq("is_hidden", false)
        .lt("created_at", currentAsset.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const prevNav = prevAsset?.asset_tag || prevAsset?.asset_id || null;
      const nextNav = nextAsset?.asset_tag || nextAsset?.asset_id || null;
      return { prev: prevNav, next: nextNav };
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
      case "reassign":
        setReassignDialogOpen(true);
        break;
    }
  };

  const getStatusColor = (status: string | null) => {
    return getStatusBadgeColor(status);
  };

  // Keyboard shortcuts — disabled when any dialog is open
  const anyDialogOpen = deleteConfirmOpen || imagePreviewOpen || checkOutDialogOpen || checkInDialogOpen || repairDialogOpen || replicateDialogOpen || disposeDialogOpen || reassignDialogOpen;
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
        <Package className="h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Asset not found</h2>
        <p className="text-sm text-muted-foreground">The asset you're looking for doesn't exist or has been removed.</p>
        <Button variant="outline" onClick={() => navigate("/assets/allassets")}>Back to Assets</Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">

      {/* Hidden asset banner */}
      {asset.is_hidden && (
        <div className="shrink-0 flex items-center gap-2 bg-muted/60 border-b px-4 py-2">
          <EyeOff className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">This asset is hidden from normal views.</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              await supabase.from("itam_assets").update({ is_hidden: false } as any).eq("id", asset.id);
              await supabase.from("itam_asset_history").insert({ asset_id: asset.id, action: "unhidden", details: { asset_tag: asset.asset_tag }, performed_by: user?.id });
              toast.success("Asset is now visible");
              invalidateQueries();
              queryClient.invalidateQueries({ queryKey: ["itam-asset-detail", assetId] });
            }}
          >
            Unhide
          </Button>
        </div>
      )}
      {/* Header with Title and Action Buttons - Fixed */}
      <div className="shrink-0 flex items-center justify-between p-3 pb-1.5">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{asset.asset_tag || 'Asset'}</h1>
              {(() => {
                const cs = asset.confirmation_status;
                const lc = asset.last_confirmed_at;
                const isAssigned = !!asset.assigned_to;
                const isOverdue = isAssigned && (!lc || differenceInDays(new Date(), new Date(lc)) > 60);
                if (cs === "confirmed" && !isOverdue) return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] gap-1 h-5"><CheckCircle2 className="h-3 w-3" />Confirmed</Badge>;
                if (cs === "denied") return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px] gap-1 h-5"><XCircle className="h-3 w-3" />Denied</Badge>;
                if (cs === "pending") return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] gap-1 h-5"><Clock className="h-3 w-3" />Pending</Badge>;
                if (isOverdue) return <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] gap-1 h-5"><Clock className="h-3 w-3" />Overdue</Badge>;
                return <Badge variant="outline" className="text-[10px] gap-1 h-5"><Minus className="h-3 w-3" />Not verified</Badge>;
              })()}
            </div>
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
              {canCheckIn(asset.status) && (
                <DropdownMenuItem onClick={() => handleAction("reassign")}>
                  Reassign
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleAction("repair")}>
                Repair
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("dispose")}>
                Dispose
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("delete")} className="text-destructive">
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("replicate")}>
                Replicate
              </DropdownMenuItem>
              {asset.assigned_to && (
                <DropdownMenuItem onClick={async () => {
                  try {
                    const { data: userData } = await supabase
                      .from("users")
                      .select("id, email, name")
                      .eq("id", asset.assigned_to)
                      .single();
                    if (!userData?.email) { toast.error("No email found for assigned user"); return; }
                    const token = crypto.randomUUID();
                    const { data: confirmation, error: confError } = await supabase
                      .from("itam_asset_confirmations")
                      .insert({ user_id: userData.id, status: "pending", token })
                      .select("id")
                      .single();
                    if (confError) throw confError;
                    await supabase.from("itam_asset_confirmation_items").insert({
                      confirmation_id: confirmation.id,
                      asset_id: asset.id,
                      status: "pending",
                    });
                    await supabase.functions.invoke("send-asset-email", {
                      body: {
                        templateId: "asset_confirmation",
                        recipientEmail: userData.email,
                        assetId: asset.id,
                        variables: {
                          user_name: userData.name || userData.email,
                          token,
                          asset_count: "1",
                        },
                      },
                    });
                    toast.success("Confirmation email sent");
                    invalidateQueries();
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to send confirmation email");
                  }
                }}>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Send Confirmation
                </DropdownMenuItem>
              )}
              {asset.status === ASSET_STATUS.AVAILABLE && !asset.assigned_to && (
                <DropdownMenuItem onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from("itam_assets")
                      .update({
                        confirmation_status: "confirmed",
                        last_confirmed_at: new Date().toISOString(),
                      } as any)
                      .eq("id", asset.id);
                    if (error) throw error;
                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase.from("itam_asset_history").insert({
                      asset_id: asset.id,
                      action: "stock_verified",
                      details: { verified_by: user?.id, method: "admin_manual" },
                      performed_by: user?.id,
                    });
                    toast.success("Asset verified as in stock");
                    invalidateQueries();
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to verify stock");
                  }
                }}>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verify Stock
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Top Section with Details - Fixed */}
      <div className="shrink-0 px-3 pb-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex gap-4">
              {/* Asset Photo or Placeholder */}
              <div className="flex-shrink-0">
                {(() => {
                  const customFields = asset.custom_fields as Record<string, any> | null;
                  const photoUrl = customFields?.photo_url;
                  
                  if (photoUrl && !imageError) {
                    return (
                      <div className="relative w-36 h-24 rounded-lg border bg-muted overflow-hidden group">
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
                    <div className="w-36 h-24 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                      <div className="text-center p-3">
                        <Package className="h-8 w-8 mx-auto mb-1 text-muted-foreground" />
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
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Asset Tag</td>
                        <td className="px-2 py-1.5 font-medium text-primary">{asset.asset_tag || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Serial Number</td>
                        <td className="px-2 py-1.5">{asset.serial_number || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Purchase Date</td>
                        <td className="px-2 py-1.5">{asset.purchase_date ? format(new Date(asset.purchase_date), "dd/MM/yyyy") : '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Purchase Price</td>
                        <td className="px-2 py-1.5 font-semibold">{getCurrencySymbol()}{asset.purchase_price?.toLocaleString() || '0.00'}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Model</td>
                        <td className="px-2 py-1.5">{asset.model || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Make</td>
                        <td className="px-2 py-1.5">{asset.make?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Location</td>
                        <td className="px-2 py-1.5">{asset.location?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Category</td>
                        <td className="px-2 py-1.5">{asset.category?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Department</td>
                        <td className="px-2 py-1.5">{asset.department?.name || '—'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Vendor</td>
                        <td className="px-2 py-1.5">
                          {asset.vendor?.name ? (
                            <span className="text-primary hover:underline cursor-pointer" onClick={() => navigate(`/assets/vendors/detail/${asset.vendor.id}`)}>{asset.vendor.name}</span>
                          ) : '—'}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-2 py-1.5 font-semibold w-[120px] text-muted-foreground">Status</td>
                        <td className="px-2 py-1.5">
                          <Badge variant="outline" className={`${getStatusColor(asset.status)} capitalize text-xs`}>
                            {getStatusLabel(asset.status)}
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
      <div className="flex-1 min-h-0 flex flex-col px-3 pb-3">
        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0 w-full overflow-x-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="warranty">Warranty</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="docs">Documents</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            
            <TabsTrigger value="maintenance">Repair</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="linking">Linking</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <DetailsTab asset={asset} />
          </TabsContent>

          <TabsContent value="warranty" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <WarrantyTab asset={asset} />
          </TabsContent>

          <TabsContent value="events" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <EventsTab assetId={asset.id} checkOutNotes={asset.check_out_notes} />
          </TabsContent>

          <TabsContent value="docs" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <DocsTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="photos" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <PhotosTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="maintenance" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <MaintenanceTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="contracts" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <ContractsTab asset={asset} />
          </TabsContent>

          <TabsContent value="linking" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <LinkingTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="audit" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <AuditTab assetId={asset.id} />
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-2 overflow-y-auto data-[state=inactive]:hidden">
            <HistoryTab assetId={String(asset.id)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Deactivate Asset"
        description="Are you sure you want to deactivate this asset? This will deactivate the asset. An administrator can restore it if needed."
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

      <ReassignAssetDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        currentAssignedTo={asset.assigned_to || null}
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
