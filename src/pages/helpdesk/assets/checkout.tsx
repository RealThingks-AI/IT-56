import { useState, useDeferredValue, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarIcon,
  Search,
  UserCheck,
  X,
  PackageOpen,
  CheckCircle2,
  SearchX,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn, sanitizeSearchInput } from "@/lib/utils";
import { useUsers } from "@/hooks/useUsers";
import { getUserDisplayName } from "@/lib/userUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";
import { useUISettings } from "@/hooks/useUISettings";
import { SortableTableHeader, type SortConfig } from "@/components/helpdesk/SortableTableHeader";

interface CachedAsset {
  id: string;
  name: string;
  asset_tag: string | null;
  asset_id: string;
  photo_url?: string | null;
}

const FALLBACK_NAV = "/assets/allassets";

const AssetThumbnail = ({ url, name, onClick }: { url?: string | null; name?: string; onClick?: () => void }) => {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div className="h-7 w-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
        <PackageOpen className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name || "Asset"}
      className="h-7 w-7 rounded object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
      onError={() => setError(true)}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      loading="lazy"
    />
  );
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedAssetCache, setSelectedAssetCache] = useState<Map<string, CachedAsset>>(new Map());
  const [assignTo, setAssignTo] = useState<string | undefined>(undefined);
  const [expectedReturn, setExpectedReturn] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "name", direction: "asc" });

  const { uiSettings, updateUISettings } = useUISettings();
  const { data: users = [] } = useUsers();

  // BUG FIX: Validate lastAssignee against current users list before applying
  const hasLoadedPrefs = useRef(false);
  useEffect(() => {
    const checkoutPrefs = (uiSettings as any)?.checkoutPreferences;
    if (!hasLoadedPrefs.current && checkoutPrefs?.lastAssignee && users.length > 0) {
      const isValid = users.some(u => u.id === checkoutPrefs.lastAssignee);
      if (isValid) {
        setAssignTo(checkoutPrefs.lastAssignee);
      }
      hasLoadedPrefs.current = true;
    }
  }, [uiSettings, users]);

  const getPhotoUrl = (asset: any): string | null => asset?.custom_fields?.photo_url || null;

  // Fetch available assets
  const { data: assets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["itam-assets-available", deferredSearch],
    queryFn: async () => {
      let query = supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name), make:itam_makes!make_id(name)")
        .eq("is_active", true)
        .eq("status", "available")
        .order("name");

      if (deferredSearch) {
        const s = sanitizeSearchInput(deferredSearch);
        query = query.or(`name.ilike.%${s}%,asset_tag.ilike.%${s}%,asset_id.ilike.%${s}%,serial_number.ilike.%${s}%,model.ilike.%${s}%`);
      }

      const { data, error } = await query.limit(5000);
      if (error) throw error;
      let results = data || [];

      if (deferredSearch) {
        const term = sanitizeSearchInput(deferredSearch).toLowerCase();
        results = results.filter((a: any) => {
          const categoryName = (a.category?.name || "").toLowerCase();
          const makeName = (a.make?.name || "").toLowerCase();
          const assetName = (a.name || "").toLowerCase();
          const tag = (a.asset_tag || "").toLowerCase();
          const serial = (a.serial_number || "").toLowerCase();
          const model = (a.model || "").toLowerCase();
          return assetName.includes(term) || tag.includes(term) || serial.includes(term) || model.includes(term) || categoryName.includes(term) || makeName.includes(term);
        });
      }

      return results;
    },
  });

  // Sort handler
  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column
        ? prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc"
        : "asc",
    }));
  }, []);

  // Sorted assets
  const sortedAssets = useMemo(() => {
    if (!sortConfig.direction) return assets;
    const sorted = [...assets].sort((a: any, b: any) => {
      let aVal: string, bVal: string;
      switch (sortConfig.column) {
        case "asset_tag": aVal = a.asset_tag || a.asset_id || ""; bVal = b.asset_tag || b.asset_id || ""; break;
        case "name": aVal = a.name || ""; bVal = b.name || ""; break;
        case "category": aVal = a.category?.name || ""; bVal = b.category?.name || ""; break;
        default: aVal = ""; bVal = "";
      }
      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
      return sortConfig.direction === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [assets, sortConfig]);

  const allVisibleSelected = sortedAssets.length > 0 && sortedAssets.every((a: any) => selectedAssets.includes(a.id));
  const someVisibleSelected = sortedAssets.some((a: any) => selectedAssets.includes(a.id));

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      const visibleIds = new Set(sortedAssets.map((a: any) => a.id));
      setSelectedAssets(prev => prev.filter(id => !visibleIds.has(id)));
      setSelectedAssetCache(prev => {
        const next = new Map(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      const newIds = sortedAssets.map((a: any) => a.id);
      setSelectedAssets(prev => [...new Set([...prev, ...newIds])]);
      setSelectedAssetCache(prev => {
        const next = new Map(prev);
        sortedAssets.forEach((a: any) => next.set(a.id, { id: a.id, name: a.name, asset_tag: a.asset_tag, asset_id: a.asset_id, photo_url: getPhotoUrl(a) }));
        return next;
      });
    }
  }, [sortedAssets, allVisibleSelected]);

  // BUG FIX: Use functional updater to avoid stale closure on selectedAssets
  const toggleAsset = useCallback((asset: any) => {
    const id = typeof asset === "string" ? asset : asset.id;
    setSelectedAssets(prev => {
      const isDeselecting = prev.includes(id);
      if (isDeselecting) return prev.filter(x => x !== id);
      // Cache on select
      if (typeof asset !== "string") {
        setSelectedAssetCache(prevCache => {
          const next = new Map(prevCache);
          next.set(id, { id: asset.id, name: asset.name, asset_tag: asset.asset_tag, asset_id: asset.asset_id, photo_url: getPhotoUrl(asset) });
          return next;
        });
      }
      return [...prev, id];
    });
  }, []);

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (selectedAssets.length === 0) throw new Error("Please select at least one asset");
      if (!assignTo) throw new Error("Please select a person to assign to");

      const now = new Date().toISOString();
      const selectedUser = users.find((u) => u.id === assignTo);
      const assignedToName = getUserDisplayName(selectedUser) || selectedUser?.email || assignTo;

      // BUG FIX: Get current user first so we can set assigned_by
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const assignments = selectedAssets.map(assetId => ({
        asset_id: assetId,
        assigned_to: assignTo,
        assigned_at: now,
        assigned_by: currentUser?.id || null,
        notes: notes || null,
      }));

      const { error: assignError } = await supabase
        .from("itam_asset_assignments")
        .insert(assignments);
      if (assignError) throw assignError;

      const { error: updateError } = await supabase
        .from("itam_assets")
        .update({
          status: "in_use",
          assigned_to: assignTo,
          checked_out_to: assignTo,
          checked_out_at: now,
          expected_return_date: expectedReturn ? format(expectedReturn, "yyyy-MM-dd") : null,
          check_out_notes: notes || null,
        })
        .in("id", selectedAssets);
      if (updateError) throw updateError;

      const { data: assetRecords } = await supabase
        .from("itam_assets")
        .select("id, asset_tag")
        .in("id", selectedAssets);

      const historyEntries = (assetRecords || []).map(asset => ({
        asset_id: asset.id,
        action: "checked_out",
        details: {
          assigned_to: assignedToName,
          user_id: assignTo,
          expected_return: expectedReturn ? format(expectedReturn, "yyyy-MM-dd") : undefined,
          notes,
        },
        performed_by: currentUser?.id,
        asset_tag: asset.asset_tag,
      }));
      if (historyEntries.length > 0) {
        await supabase.from("itam_asset_history").insert(historyEntries);
      }

      return selectedAssets.length;
    },
    onSuccess: (count) => {
      setShowSuccess(true);
      toast.success(`${count} asset(s) checked out successfully`);
      invalidateAllAssetQueries(queryClient);

      if (assignTo) {
        updateUISettings.mutate({
          checkoutPreferences: { lastAssignee: assignTo },
        } as any);
      }

      setTimeout(() => navigate(FALLBACK_NAV), 500);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to checkout assets");
    },
  });

  const handleCheckout = () => setConfirmOpen(true);
  const confirmCheckout = () => {
    setConfirmOpen(false);
    checkoutMutation.mutate();
  };

  const assigneeName = useMemo(() => {
    if (!assignTo) return "";
    const u = users.find(u => u.id === assignTo);
    return getUserDisplayName(u) || u?.email || "";
  }, [assignTo, users]);

  const isStaleSearch = search !== deferredSearch;
  const canCheckout = selectedAssets.length > 0 && !!assignTo && !checkoutMutation.isPending && !showSuccess;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmOpen) {
        navigate(FALLBACK_NAV);
        return;
      }
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (e.key === "Enter" && !e.shiftKey && canCheckout && !confirmOpen && activeTag !== "textarea" && activeTag !== "input") {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canCheckout, confirmOpen, navigate]);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="flex gap-3 h-full">
          {/* Asset Selection */}
          <Card className="flex-1 min-w-0 flex flex-col min-h-0 shadow-none border">
            <CardHeader className="pb-2 px-3 pt-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search tag, name, model, serial..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-7 h-8 text-xs"
                      aria-label="Search available assets"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs h-5 gap-1 flex-shrink-0">
                    {isLoading ? "…" : sortedAssets.length} available
                  </Badge>
                </div>
                {selectedAssets.length > 0 && (
                  <Badge variant="default" className="text-xs h-5 gap-1 flex-shrink-0">
                    {selectedAssets.length} selected
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex flex-col flex-1 min-h-0 p-0">
              {isError && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-destructive/30 bg-destructive/5">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-xs text-destructive">Failed to load assets.</p>
                  <Button variant="outline" size="sm" className="ml-auto h-6 text-xs px-2" onClick={() => refetch()}>Retry</Button>
                </div>
              )}

              <ScrollArea className="flex-1 min-h-0">
                <Table className="table-fixed" wrapperClassName="border-0 rounded-none">
                  <colgroup>
                    <col className="w-[36px]" />
                    <col className="w-[44px]" />
                    <col className="w-[40px]" />
                    <col className="w-[120px]" />
                    <col />
                    <col className="w-[120px]" />
                  </colgroup>
                  <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="px-2 h-8">
                        <Checkbox
                          checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                          onCheckedChange={toggleSelectAll}
                          disabled={sortedAssets.length === 0}
                          aria-label="Select all"
                          className="h-3.5 w-3.5"
                        />
                      </TableHead>
                      <TableHead className="text-xs px-1 h-8">#</TableHead>
                      <TableHead className="px-1 h-8"></TableHead>
                      <SortableTableHeader column="asset_tag" label="Asset Tag" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" />
                      <SortableTableHeader column="name" label="Asset" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" />
                      <SortableTableHeader column="category" label="Category" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" />
                    </TableRow>
                  </TableHeader>

                  <TableBody className={cn("transition-opacity duration-200", isStaleSearch && "opacity-50")}>
                    {isLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={`sk-${i}`}>
                          <TableCell className="px-2"><Skeleton className="h-3.5 w-3.5 rounded" /></TableCell>
                          <TableCell className="px-1"><Skeleton className="h-3 w-4" /></TableCell>
                          <TableCell className="px-1"><Skeleton className="h-7 w-7 rounded" /></TableCell>
                          <TableCell className="px-2"><Skeleton className="h-3 w-16" /></TableCell>
                          <TableCell className="px-2"><Skeleton className="h-3 w-20" /></TableCell>
                          <TableCell className="px-2"><Skeleton className="h-3 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : sortedAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10">
                          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                            {search ? (
                              <>
                                <SearchX className="h-6 w-6 opacity-40" />
                                <p className="text-xs">No assets match "{search}"</p>
                                <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline mt-1">Clear search</button>
                              </>
                            ) : (
                              <>
                                <PackageOpen className="h-6 w-6 opacity-40" />
                                <p className="text-xs">No available assets</p>
                                <p className="text-xs opacity-60">All assets are currently checked out or inactive</p>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedAssets.map((asset: any, index: number) => (
                        <TableRow
                          key={asset.id}
                          className={cn(
                            "cursor-pointer transition-colors duration-100 h-9",
                            selectedAssets.includes(asset.id)
                              ? "bg-primary/8 hover:bg-primary/12"
                              : "hover:bg-muted/40"
                          )}
                          onClick={() => toggleAsset(asset)}
                        >
                          <TableCell className="px-2 py-1">
                            <Checkbox
                              checked={selectedAssets.includes(asset.id)}
                              onCheckedChange={() => toggleAsset(asset)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5"
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums px-1 py-1 whitespace-nowrap">{index + 1}</TableCell>
                          <TableCell className="px-1 py-1">
                            <AssetThumbnail
                              url={getPhotoUrl(asset)}
                              name={asset.name}
                              onClick={() => {
                                const url = getPhotoUrl(asset);
                                if (url) setPreviewImage({ url, name: asset.name });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-2 py-1 truncate">{asset.asset_tag || asset.asset_id}</TableCell>
                          <TableCell className="text-xs font-medium px-2 py-1 truncate">{asset.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground px-2 py-1 truncate">{asset.category?.name || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card className="w-[340px] flex-shrink-0 flex flex-col lg:sticky lg:top-3 lg:self-start shadow-sm border">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                Check Out
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Assign selected assets to a user</p>
            </CardHeader>

            <CardContent className="space-y-4 px-3 pb-3">
              {selectedAssets.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {selectedAssets.map(id => {
                    const cached = selectedAssetCache.get(id);
                    if (!cached) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-0.5 text-xs h-5 px-1.5">
                        {cached.asset_tag || cached.name}
                        <X className="h-2.5 w-2.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => toggleAsset(id)} />
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Select assets from the list</p>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Assign To <span className="text-destructive">*</span></Label>
                <Select value={assignTo || undefined} onValueChange={setAssignTo}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {getUserDisplayName(user) || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Expected Return</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-xs",
                        !expectedReturn && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {expectedReturn ? format(expectedReturn, "MMM dd, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expectedReturn}
                      onSelect={setExpectedReturn}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className="p-2 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                 <Textarea
                  placeholder="Checkout notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="text-xs resize-none min-h-[60px]"
                />
              </div>

              <div className="pt-2 space-y-1.5 border-t">
                <Button className="w-full h-8 text-xs" onClick={handleCheckout} disabled={!canCheckout}>
                  {showSuccess ? (
                    <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Done!</>
                  ) : checkoutMutation.isPending ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Check Out{selectedAssets.length > 0 ? ` (${selectedAssets.length})` : ""}</>
                  )}
                </Button>
                <Button variant="outline" className="w-full h-8 text-xs" onClick={() => navigate(FALLBACK_NAV)} disabled={checkoutMutation.isPending || showSuccess}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-lg p-2">
          {previewImage && (
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="w-full h-auto max-h-[70vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Checkout</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Check out <strong>{selectedAssets.length}</strong> asset{selectedAssets.length !== 1 ? "s" : ""} to <strong>{assigneeName}</strong>.</p>
                {expectedReturn && (
                  <p className="text-muted-foreground">Expected return: <strong>{format(expectedReturn, "MMM dd, yyyy")}</strong></p>
                )}
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {selectedAssets.map(id => {
                    const cached = selectedAssetCache.get(id);
                    if (!cached) return null;
                    return <Badge key={id} variant="secondary" className="text-xs h-5">{cached.asset_tag || cached.name}</Badge>;
                  })}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCheckout} disabled={checkoutMutation.isPending} className="h-8 text-xs">
              {checkoutMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Processing...</> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CheckoutPage;
