import { useState, useDeferredValue, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Trash2, X, AlertTriangle, PackageOpen, Loader2, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AssetThumbnail } from "@/components/helpdesk/assets/AssetThumbnail";
import { ImagePreviewDialog } from "@/components/helpdesk/assets/ImagePreviewDialog";
import { EmptyState } from "@/components/helpdesk/assets/EmptyState";
import { AssetSearchBar } from "@/components/helpdesk/assets/AssetSearchBar";
import { cn, sanitizeSearchInput } from "@/lib/utils";
import { getStatusLabel } from "@/lib/assets/assetStatusUtils";
import { PaginationControls } from "@/components/helpdesk/assets/PaginationControls";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";
import { SortableTableHeader, type SortConfig } from "@/components/helpdesk/SortableTableHeader";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useCurrency } from "@/hooks/useCurrency";

import { FALLBACK_NAV, useAssetPageShortcuts } from "@/lib/assets/assetHelpers";

const DisposePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const { symbol: currencySymbol } = useCurrency();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [disposalMethod, setDisposalMethod] = useState<string | undefined>(undefined);
  const [disposalDate, setDisposalDate] = useState<Date>(new Date());
  const [disposalValue, setDisposalValue] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 200;
  const { data: assets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["itam-assets-for-disposal", deferredSearch],
    queryFn: async () => {
      let query = supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name), make:itam_makes!make_id(name)")
        .eq("is_active", true)
        .neq("status", "disposed")
        .order("name");

      if (deferredSearch) {
        const s = sanitizeSearchInput(deferredSearch);
        query = query.or(`name.ilike.%${s}%,asset_tag.ilike.%${s}%,asset_id.ilike.%${s}%,serial_number.ilike.%${s}%,model.ilike.%${s}%`);
      }

      const { data, error: queryError } = await query.limit(5000);
      if (queryError) throw queryError;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const disposeMutation = useMutation({
    mutationFn: async () => {
      if (selectedAssets.length === 0) throw new Error("Please select at least one asset");
      if (!disposalMethod) throw new Error("Please select a disposal method");

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Fetch existing data for all selected assets
      const { data: existingAssets } = await supabase
        .from("itam_assets")
        .select("id, custom_fields, status, asset_tag")
        .in("id", selectedAssets);

      // Build merged custom_fields per asset for history, then batch update
      const historyEntries = (existingAssets || []).map((existing) => {
        return {
          asset_id: existing.id,
          asset_tag: existing.asset_tag || null,
          action: "disposed",
          old_value: getStatusLabel(existing.status),
          new_value: getStatusLabel("disposed"),
          details: {
            disposal_method: disposalMethod,
            disposal_date: disposalDate.toISOString(),
            disposal_value: disposalValue ? parseFloat(disposalValue) : null,
            notes,
          },
          performed_by: currentUser?.id,
        };
      });

      // Per-asset update to merge disposal data into each asset's custom_fields
      for (const existing of (existingAssets || [])) {
        const existingCustomFields = (existing.custom_fields as Record<string, any>) || {};
        const mergedCustomFields = {
          ...existingCustomFields,
          disposal_method: disposalMethod,
          disposal_date: disposalDate.toISOString(),
          disposal_value: disposalValue ? parseFloat(disposalValue) : null,
          disposal_notes: notes || null,
        };

        const { error } = await supabase
          .from("itam_assets")
          .update({
            status: "disposed",
            is_active: false,
            notes: notes || null,
            assigned_to: null,
            checked_out_to: null,
            checked_out_at: null,
            expected_return_date: null,
            check_out_notes: null,
            custom_fields: mergedCustomFields,
          })
          .eq("id", existing.id);

        if (error) throw error;
      }


      // Batch close assignments
      await supabase
        .from("itam_asset_assignments")
        .update({ returned_at: new Date().toISOString() })
        .in("asset_id", selectedAssets)
        .is("returned_at", null);

      // Batch insert history
      if (historyEntries.length > 0) {
        await supabase.from("itam_asset_history").insert(historyEntries);
      }
    },
    onSuccess: () => {
      toast.success(`${selectedAssets.length} asset(s) disposed successfully`);
      invalidateAllAssetQueries(queryClient);
      setShowSuccess(true);
      setTimeout(() => navigate(FALLBACK_NAV), 1200);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to dispose assets");
    },
  });

  const toggleAsset = useCallback((assetId: string) => {
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  }, []);

  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column
        ? prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc"
        : "asc",
    }));
  }, []);

  const sortedAssets = useMemo(() => {
    if (!sortConfig.direction) return assets;
    const sorted = [...assets].sort((a: any, b: any) => {
      let aVal: string, bVal: string;
      switch (sortConfig.column) {
        case "asset_tag": aVal = a.asset_tag || a.asset_id || ""; bVal = b.asset_tag || b.asset_id || ""; break;
        case "name": aVal = a.name || ""; bVal = b.name || ""; break;
        case "category": aVal = (a.category as any)?.name || ""; bVal = (b.category as any)?.name || ""; break;
        default: aVal = ""; bVal = "";
      }
      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
      return sortConfig.direction === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [assets, sortConfig]);

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [deferredSearch]);

  const totalPages = Math.ceil(sortedAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = sortedAssets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const canDispose = selectedAssets.length > 0 && !!disposalMethod && !disposeMutation.isPending;

  const totalValue = assets
    .filter(a => selectedAssets.includes(a.id))
    .reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0);

  // Keyboard shortcuts
  useAssetPageShortcuts({
    canConfirm: canDispose,
    dialogOpen: confirmOpen,
    onConfirm: () => setConfirmOpen(true),
  });

  const allVisibleSelected = sortedAssets.length > 0 && sortedAssets.every((a: any) => selectedAssets.includes(a.id));
  const someVisibleSelected = sortedAssets.some((a: any) => selectedAssets.includes(a.id));

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Warning Banner */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border-b border-destructive/20">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        <p className="text-xs text-destructive font-medium">
          Disposed assets will be marked inactive. This can be reversed by editing the asset.
        </p>
      </div>

      {isError && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border-b border-destructive/20">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          <p className="text-xs text-destructive">Failed to load assets.</p>
          <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="flex gap-3 h-full">
          {/* Asset Selection */}
          <Card className="flex-1 min-w-0 flex flex-col min-h-0 shadow-none border">
            <CardHeader className="pb-2 px-3 pt-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AssetSearchBar
                      value={search}
                      onChange={setSearch}
                      placeholder="Search tag, name, ID..."
                      ariaLabel="Search assets for disposal"
                    />
                  <Badge variant="outline" className="text-xs h-5 gap-1 flex-shrink-0">
                    {sortedAssets.length} assets
                  </Badge>
                </div>
                {selectedAssets.length > 0 && (
                  <Badge variant="destructive" className="text-xs h-5 gap-1 flex-shrink-0">
                    {selectedAssets.length} selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 min-h-0 p-0">
              {selectedAssets.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-b bg-destructive/5">
                  <span className="text-xs font-medium">Selected:</span>
                  {selectedAssets.slice(0, 5).map(id => {
                    const asset = assets.find(a => a.id === id);
                    return asset ? (
                      <Badge key={id} variant="destructive" className="gap-1 text-[10px] h-4">
                        {asset.asset_tag || asset.name}
                        <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => toggleAsset(id)} />
                      </Badge>
                    ) : null;
                  })}
                  {selectedAssets.length > 5 && (
                    <span className="text-xs text-muted-foreground">+{selectedAssets.length - 5} more</span>
                  )}
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-auto">
                <Table className="table-fixed" wrapperClassName="border-0 rounded-none">
                  <colgroup>
                    <col className="w-[36px]" />
                    <col className="w-[44px]" />
                    <col className="w-[36px]" />
                    <col className="w-[120px]" />
                    <col />
                    <col className="w-[100px]" />
                    <col className="w-[80px]" />
                    <col className="w-[90px]" />
                  </colgroup>
                  <TableHeader className="sticky top-0 bg-muted shadow-sm z-10">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="px-2 h-8">
                        <Checkbox
                          checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                          onCheckedChange={() => {
                            if (allVisibleSelected) {
                              // Only deselect currently visible assets, preserve cross-search selections
                              const visibleIds = new Set(sortedAssets.map((a: any) => a.id));
                              setSelectedAssets(prev => prev.filter(id => !visibleIds.has(id)));
                            } else {
                              // Add visible assets to existing selections
                              const newIds = sortedAssets.map((a: any) => a.id);
                              setSelectedAssets(prev => [...new Set([...prev, ...newIds])]);
                            }
                          }}
                          disabled={sortedAssets.length === 0}
                          aria-label="Select all"
                          className="h-3.5 w-3.5"
                        />
                      </TableHead>
                      <TableHead className="text-xs font-medium px-2 h-8">#</TableHead>
                      <SortableTableHeader label="" column="" sortConfig={sortConfig} onSort={() => {}} className="w-8" />
                      <SortableTableHeader label="Tag/ID" column="asset_tag" sortConfig={sortConfig} onSort={handleSort} />
                      <SortableTableHeader label="Name" column="name" sortConfig={sortConfig} onSort={handleSort} />
                      <SortableTableHeader label="Category" column="category" sortConfig={sortConfig} onSort={handleSort} />
                      <TableHead className="text-xs font-medium">Status</TableHead>
                      <TableHead className="text-xs font-medium">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={`skel-${i}`} className="h-9">
                          <TableCell className="py-1 px-2"><Skeleton className="h-3.5 w-3.5" /></TableCell>
                          <TableCell className="py-1 px-2"><Skeleton className="h-3 w-6" /></TableCell>
                          <TableCell className="py-1 px-2"><Skeleton className="h-6 w-6 rounded" /></TableCell>
                          <TableCell className="py-1"><Skeleton className="h-3 w-20" /></TableCell>
                          <TableCell className="py-1"><Skeleton className="h-3 w-24" /></TableCell>
                          <TableCell className="py-1"><Skeleton className="h-3 w-16" /></TableCell>
                          <TableCell className="py-1"><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell className="py-1"><Skeleton className="h-3 w-14" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedAssets.map((asset, index) => (
                      <TableRow
                        key={asset.id}
                        className={cn(
                          "cursor-pointer h-9 transition-colors",
                          selectedAssets.includes(asset.id) && "bg-destructive/5",
                          index % 2 === 1 && !selectedAssets.includes(asset.id) && "bg-muted/30"
                        )}
                        onClick={() => toggleAsset(asset.id)}
                      >
                        <TableCell className="py-1 px-2">
                          <Checkbox
                            checked={selectedAssets.includes(asset.id)}
                            onCheckedChange={() => toggleAsset(asset.id)}
                            className="h-3.5 w-3.5"
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1 px-2">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell className="py-1 px-2">
                          <AssetThumbnail
                            url={(asset as any).custom_fields?.photo_url}
                            name={asset.name}
                            onClick={() => {
                              const url = (asset as any).custom_fields?.photo_url;
                              if (url) setPreviewImage({ url, name: asset.name });
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          <span
                            className="text-primary hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`);
                            }}
                          >
                            {asset.asset_tag || asset.asset_id}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-1 font-medium">{asset.name}</TableCell>
                        <TableCell className="text-xs py-1">{(asset.category as any)?.name || "—"}</TableCell>
                        <TableCell className="py-1">
                          <Badge variant="secondary" className="text-[10px] h-4">{getStatusLabel(asset.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {asset.purchase_price
                            ? `${currencySymbol}${parseFloat(String(asset.purchase_price)).toLocaleString()}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && sortedAssets.length === 0 && (
                      <TableRow>
                      <TableCell colSpan={8} className="text-center p-0">
                          <EmptyState
                            title="No assets available for disposal"
                            search={search}
                            onClearSearch={() => setSearch("")}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sortedAssets.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>

          {/* Disposal Form */}
          <div className="w-[340px] flex-shrink-0 flex flex-col gap-3 min-h-0 overflow-auto">
            <Card className="shadow-none border">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  Disposal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2.5">
                {selectedAssets.length > 0 && (
                  <div className="p-2 bg-accent rounded-lg">
                    <p className="text-xs">
                      <span className="font-medium">Total Value:</span>{" "}
                      {currencySymbol}{totalValue.toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Disposal Method *</Label>
                  <Select value={disposalMethod || undefined} onValueChange={setDisposalMethod}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="donated">Donated</SelectItem>
                      <SelectItem value="recycled">Recycled</SelectItem>
                      <SelectItem value="scrapped">Scrapped</SelectItem>
                      <SelectItem value="returned">Returned to Vendor</SelectItem>
                      <SelectItem value="lost">Lost/Stolen</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Disposal Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {format(disposalDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={disposalDate}
                        onSelect={(date) => date && setDisposalDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Disposal Value (if sold)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={disposalValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || (!isNaN(Number(val)) && Number(val) >= 0)) {
                        setDisposalValue(val);
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    placeholder="Add any notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-xs resize-none min-h-[48px]"
                  />
                </div>

                <div className="border-t pt-2 flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1 h-8 text-xs"
                    onClick={() => setConfirmOpen(true)}
                    disabled={!canDispose || showSuccess}
                  >
                    {showSuccess ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done!</>
                    ) : disposeMutation.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Processing...</>
                    ) : (
                      `Dispose ${selectedAssets.length} Asset(s)`
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => navigate(FALLBACK_NAV)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ImagePreviewDialog image={previewImage} onClose={() => setPreviewImage(null)} />

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Disposal</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to dispose {selectedAssets.length} asset(s)? This will mark them as disposed and remove from active inventory.</p>
                {selectedAssets.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedAssets.slice(0, 8).map(id => {
                      const asset = assets.find(a => a.id === id);
                      return asset ? (
                        <Badge key={id} variant="destructive" className="text-[10px] h-4">{asset.asset_tag || asset.name}</Badge>
                      ) : null;
                    })}
                    {selectedAssets.length > 8 && <span className="text-xs text-muted-foreground">+{selectedAssets.length - 8} more</span>}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => disposeMutation.mutate()} disabled={disposeMutation.isPending}>
              {disposeMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Processing...</> : "Dispose"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DisposePage;
