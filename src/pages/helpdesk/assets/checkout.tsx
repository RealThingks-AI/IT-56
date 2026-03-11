import { useState, useDeferredValue, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSET_STATUS } from "@/lib/assets/assetStatusUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImagePreviewDialog } from "@/components/helpdesk/assets/ImagePreviewDialog";
import { EmptyState } from "@/components/helpdesk/assets/EmptyState";
import { AssetSearchBar } from "@/components/helpdesk/assets/AssetSearchBar";
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
  UserCheck,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  History,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsers } from "@/hooks/useUsers";
import { useAvailableAssets } from "@/hooks/assets/useAvailableAssets";
import { useAssetSelection } from "@/hooks/assets/useAssetSelection";
import { useSortableAssets } from "@/hooks/assets/useSortableAssets";
import { PaginationControls } from "@/components/helpdesk/assets/PaginationControls";
import { getUserDisplayName } from "@/lib/userUtils";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";

import { SortableTableHeader } from "@/components/helpdesk/SortableTableHeader";
import { useUsersLookup } from "@/hooks/useUsersLookup";
import { formatRelativeTime } from "@/lib/dateUtils";

import { FALLBACK_NAV, getPhotoUrl, useAssetPageShortcuts } from "@/lib/assets/assetHelpers";
import { AssetThumbnail } from "@/components/helpdesk/assets/AssetThumbnail";

const getColumnValue = (item: any, column: string): string => {
  switch (column) {
    case "asset_tag": return item.asset_tag || item.asset_id || "";
    case "name": return item.name || "";
    case "category": return item.category?.name || "";
    default: return "";
  }
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const deferredSearch = useDeferredValue(search);
  const [assignTo, setAssignTo] = useState<string | undefined>(undefined);
  const [expectedReturn, setExpectedReturn] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 200;

  const { data: users = [] } = useUsers();
  const { resolveUserName } = useUsersLookup();
  const [searchParams] = useSearchParams();
  const autoSelectDone = useRef(false);

  // Auto-select user from ?user= param
  useEffect(() => {
    if (autoSelectDone.current || !users.length) return;
    const userId = searchParams.get("user");
    if (userId && users.some(u => u.id === userId)) {
      setAssignTo(userId);
      autoSelectDone.current = true;
    }
  }, [users, searchParams]);

  // Recent checkouts query
  const { data: recentCheckouts = [] } = useQuery({
    queryKey: ["recent-checkouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_asset_history")
        .select("id, created_at, action, new_value, old_value, asset_tag, performed_by, details")
        .eq("action", "checked_out")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    staleTime: 30_000,
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["itam-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_categories").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  // Fetch available assets via shared hook
  const { data: rawAssets = [], isLoading, isError, refetch } = useAvailableAssets({
    status: "available",
    search: deferredSearch,
    queryKey: "itam-assets-available",
    limit: 5000,
  });
  const isStaleSearch = search !== deferredSearch;

  // Apply category filter client-side
  const assets = useMemo(() => {
    if (categoryFilter === "all") return rawAssets;
    return rawAssets.filter((a: any) => a.category?.name === categoryFilter);
  }, [rawAssets, categoryFilter]);

  // Shared selection hook
  const {
    selectedIds: selectedAssets,
    selectedCache: selectedAssetCache,
    toggleItem: toggleAsset,
    toggleAll: toggleSelectAll,
    clearSelection,
    isSelected,
    selectedCount,
  } = useAssetSelection<any>((item) => item.id);

  // Shared sort hook
  const { sortedData: sortedAssets, sortConfig, handleSort } = useSortableAssets(
    assets,
    getColumnValue,
    { initialColumn: "name", initialDirection: "asc" }
  );

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [deferredSearch]);

  const totalPages = Math.ceil(sortedAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = sortedAssets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const allVisibleSelected = sortedAssets.length > 0 && sortedAssets.every((a: any) => isSelected(a.id));
  const someVisibleSelected = sortedAssets.some((a: any) => isSelected(a.id));

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (selectedAssets.length === 0) throw new Error("Please select at least one asset");
      if (!assignTo) throw new Error("Please select a person to assign to");

      const now = new Date().toISOString();
      const selectedUser = users.find((u) => u.id === assignTo);
      const assignedToName = getUserDisplayName(selectedUser) || selectedUser?.email || assignTo;

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
          status: ASSET_STATUS.IN_USE,
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
        old_value: "In Stock",
        new_value: assignedToName,
        details: {
          assigned_to: assignedToName,
          user_id: assignTo,
          checkout_type: "person",
          checkout_date: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          expected_return: expectedReturn ? format(expectedReturn, "yyyy-MM-dd") : undefined,
          notes: notes || undefined,
        },
        performed_by: currentUser?.id,
        asset_tag: asset.asset_tag,
      }));
      if (historyEntries.length > 0) {
        await supabase.from("itam_asset_history").insert(historyEntries);
      }

      return selectedAssets.length;
    },
    onSuccess: async (count) => {
      setShowSuccess(true);
      toast.success(`${count} asset(s) checked out successfully`);
      invalidateAllAssetQueries(queryClient);

      if (assignTo && sendEmail) {
        try {
          const selectedUser = users.find(u => u.id === assignTo);
          const userEmail = selectedUser?.email;
          const userName = getUserDisplayName(selectedUser) || selectedUser?.email || "";

          if (userEmail) {
            const { data: fullAssets } = await supabase
              .from("itam_assets")
              .select("asset_tag, name, serial_number, model, custom_fields, itam_categories(name), make:itam_makes!make_id(name)")
              .in("id", selectedAssets);

            const assetRows = (fullAssets || []).map((a: any) => ({
              asset_tag: a.asset_tag || "N/A",
              description: a.itam_categories?.name || a.name || "N/A",
              brand: a.make?.name || "N/A",
              model: a.model || "N/A",
              serial_number: a.serial_number || null,
              photo_url: (a.custom_fields as any)?.photo_url || null,
            }));

            const { data, error } = await supabase.functions.invoke("send-asset-email", {
              body: {
                templateId: "checkout",
                recipientEmail: userEmail,
                assets: assetRows,
                variables: {
                  user_name: userName,
                  checkout_date: format(new Date(), "dd/MM/yyyy HH:mm"),
                  expected_return_date: expectedReturn ? format(expectedReturn, "dd/MM/yyyy") : "Not specified",
                  notes: notes || "—",
                },
              },
            });
            if (!error && data?.success && !data?.skipped) {
              toast.success("Email notification sent");
            }
          }
        } catch (emailErr) {
          console.warn("Email notification failed:", emailErr);
          toast.warning("Email notification could not be sent");
        }
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

  const canCheckout = selectedCount > 0 && !!assignTo && !checkoutMutation.isPending && !showSuccess;

  // Keyboard shortcuts
  useAssetPageShortcuts({
    canConfirm: canCheckout,
    dialogOpen: confirmOpen,
    onConfirm: handleCheckout,
  });

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="flex gap-3 h-full">
          {/* Asset Selection */}
          <Card className="flex-1 min-w-0 flex flex-col min-h-0 shadow-sm border">
            <CardHeader className="pb-1.5 px-3 pt-2.5 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AssetSearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search tag, name, model, serial..."
                    ariaLabel="Search available assets"
                    className="w-[200px]"
                  />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-7 w-[140px] text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.name} className="text-xs">{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-xs h-5 gap-1 flex-shrink-0">
                    {isLoading ? "…" : sortedAssets.length} available
                  </Badge>
                </div>
                {selectedCount > 0 && (
                  <Badge variant="outline" className="text-xs h-5 gap-1 flex-shrink-0">
                    {selectedCount} selected
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
                <Table className="table-fixed" wrapperClassName="border-0 rounded-none overflow-visible">
                  <colgroup>
                    <col className="w-[36px]" />
                    <col className="w-[44px]" />
                    <col className="w-[40px]" />
                    <col className="w-[120px]" />
                    <col />
                    <col className="w-[120px]" />
                  </colgroup>
                  <TableHeader className="sticky top-0 bg-muted shadow-sm z-10">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="px-2 h-8">
                        <Checkbox
                          checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                          onCheckedChange={() => toggleSelectAll(sortedAssets, allVisibleSelected)}
                          disabled={sortedAssets.length === 0}
                          aria-label="Select all"
                          className="h-3.5 w-3.5"
                        />
                      </TableHead>
                      <TableHead className="text-xs px-1 h-8">#</TableHead>
                      <TableHead className="px-1 h-8"></TableHead>
                      <SortableTableHeader column="asset_tag" label="Asset Tag" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" style={{ width: 120 }} />
                      <SortableTableHeader column="name" label="Asset" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" />
                      <SortableTableHeader column="category" label="Category" sortConfig={sortConfig} onSort={handleSort} className="text-xs px-2" style={{ width: 120 }} />
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
                        <TableCell colSpan={6} className="text-center p-0">
                          <EmptyState
                            title="No assets in stock"
                            subtitle="All assets are currently checked out or inactive"
                            search={search}
                            onClearSearch={() => setSearch("")}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAssets.map((asset: any, index: number) => (
                        <TableRow
                          key={asset.id}
                          className={cn(
                            "cursor-pointer transition-colors duration-100 h-9",
                            isSelected(asset.id)
                              ? "bg-primary/10 hover:bg-primary/15"
                              : "hover:bg-muted/40"
                          )}
                          onClick={() => toggleAsset(asset)}
                        >
                          <TableCell className="px-2 py-1">
                            <Checkbox
                              checked={isSelected(asset.id)}
                              onCheckedChange={() => toggleAsset(asset)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5"
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums px-1 py-1 whitespace-nowrap">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
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
                          <TableCell className="text-sm text-muted-foreground px-2 py-1 truncate">
                            {(asset.asset_tag || asset.asset_id) ? (
                              <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`); }}>{asset.asset_tag || asset.asset_id}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm px-2 py-1 truncate">{asset.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground px-2 py-1 truncate">{asset.category?.name || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sortedAssets.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="w-[320px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto max-h-full">
            {/* Checkout Form */}
            <Card className="flex-shrink-0 shadow-sm border">
              <CardHeader className="pb-1.5 px-3 pt-2.5">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  Check Out
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 px-3 pb-3">
                {selectedCount > 0 ? (
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
                  <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-8 text-xs font-normal">
                        {assignTo ? assigneeName : "Select person..."}
                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search users..." className="h-8 text-xs" />
                        <CommandList>
                          <CommandEmpty className="py-3 text-xs">No users found.</CommandEmpty>
                          <CommandGroup>
                            {users.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={getUserDisplayName(user) || user.email}
                                onSelect={() => { setAssignTo(user.id); setUserSearchOpen(false); }}
                                className={cn(
                                  "text-xs",
                                  assignTo === user.id && "bg-primary/20 font-medium"
                                )}
                              >
                                {getUserDisplayName(user) || user.email}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                    rows={2}
                    className="text-xs resize-none min-h-[48px]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="checkout-send-email"
                      checked={sendEmail}
                      onCheckedChange={(checked) => setSendEmail(!!checked)}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor="checkout-send-email" className="text-xs font-normal cursor-pointer">
                      Send email notification to user
                    </Label>
                  </div>
                  {sendEmail && assignTo && (() => {
                    const selectedUser = users.find(u => u.id === assignTo);
                    return selectedUser?.email ? (
                      <p className="text-[11px] text-muted-foreground pl-5">
                        To: {selectedUser.email}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div className="pt-2 flex gap-2 border-t">
                  <Button className="flex-1 h-8 text-xs" onClick={handleCheckout} disabled={!canCheckout}>
                    {showSuccess ? (
                      <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Done!</>
                    ) : checkoutMutation.isPending ? (
                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Processing...</>
                    ) : (
                      <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Check Out{selectedCount > 0 ? ` (${selectedCount})` : ""}</>
                    )}
                  </Button>
                  <Button variant="outline" className="h-8 text-xs px-4" onClick={() => navigate(FALLBACK_NAV)} disabled={checkoutMutation.isPending || showSuccess}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Check Outs */}
            <Card className="flex-1 min-h-0 shadow-sm border flex flex-col">
              <CardHeader className="pb-1.5 px-3 pt-2.5 flex-shrink-0">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <History className="h-3 w-3" />
                  Recent Check Outs
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 flex-1 min-h-0 overflow-y-auto">
                {recentCheckouts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No recent check outs</p>
                ) : (
                  <div>
                    <Table wrapperClassName="border-0 rounded-none">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] px-1.5 h-6">When</TableHead>
                          <TableHead className="text-[11px] px-1.5 h-6">Asset Tag</TableHead>
                          <TableHead className="text-[11px] px-1.5 h-6">User</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentCheckouts.map((tx: any) => (
                          <TableRow key={tx.id} className="h-7">
                            <TableCell className="text-[11px] text-muted-foreground px-1.5 py-0.5 whitespace-nowrap">
                              {formatRelativeTime(tx.created_at)}
                            </TableCell>
                            <TableCell className="text-[11px] px-1.5 py-0.5">
                              {tx.asset_tag ? (
                                <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/allassets?search=${encodeURIComponent(tx.asset_tag)}`); }}>{tx.asset_tag}</span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-[11px] text-muted-foreground px-1.5 py-0.5 truncate max-w-[120px]">
                              {(() => {
                                // Only navigate if we have a valid UUID for the user
                                const details = tx.details as any;
                                const userId = details?.user_id && /^[0-9a-f]{8}-/i.test(details.user_id) ? details.user_id : null;
                                const userName = tx.new_value || resolveUserName(tx.performed_by) || "—";
                                return userName !== "—" && userId ? (
                                  <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/employees?user=${userId}`); }}>{userName}</span>
                                ) : userName;
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
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
            <AlertDialogTitle>Confirm Checkout</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Check out <strong>{selectedCount}</strong> asset{selectedCount !== 1 ? "s" : ""} to <strong>{assigneeName}</strong>.</p>
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
