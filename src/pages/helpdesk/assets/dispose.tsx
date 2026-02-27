import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Search, Trash2, X, AlertTriangle } from "lucide-react";
import { cn, sanitizeSearchInput } from "@/lib/utils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

const DisposePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [disposalMethod, setDisposalMethod] = useState<string | undefined>(undefined);
  const [disposalDate, setDisposalDate] = useState<Date>(new Date());
  const [disposalValue, setDisposalValue] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch non-disposed assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["itam-assets-for-disposal", search],
    queryFn: async () => {
      let query = supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name)")
        .eq("is_active", true)
        .neq("status", "disposed")
        .order("name");

      if (search) {
        const s = sanitizeSearchInput(search);
        query = query.or(`name.ilike.%${s}%,asset_tag.ilike.%${s}%,asset_id.ilike.%${s}%`);
      }

      const { data } = await query.limit(50);
      return data || [];
    },
  });

  // Dispose mutation
  const disposeMutation = useMutation({
    mutationFn: async () => {
      if (selectedAssets.length === 0) throw new Error("Please select at least one asset");
      if (!disposalMethod) throw new Error("Please select a disposal method");

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Process each asset individually to merge custom_fields
      for (const assetId of selectedAssets) {
        // Fetch existing asset to preserve custom_fields
        const { data: existing } = await supabase
          .from("itam_assets")
          .select("custom_fields, status")
          .eq("id", assetId)
          .single();

        const existingFields = (existing?.custom_fields as Record<string, any>) || {};
        const mergedFields = {
          ...existingFields,
          disposal_date: disposalDate.toISOString(),
          disposal_method: disposalMethod,
          disposal_value: disposalValue ? parseFloat(disposalValue) : null,
        };

        const { error } = await supabase
          .from("itam_assets")
          .update({ 
            status: "disposed",
            notes: notes || null,
            custom_fields: mergedFields,
            assigned_to: null,
            checked_out_to: null,
            checked_out_at: null,
            expected_return_date: null,
            check_out_notes: null,
          })
          .eq("id", assetId);

        if (error) throw error;

        // Close any open assignments for this asset
        await supabase
          .from("itam_asset_assignments")
          .update({ returned_at: new Date().toISOString() })
          .eq("asset_id", assetId)
          .is("returned_at", null);

        // Log to history
        await supabase.from("itam_asset_history").insert({
          asset_id: assetId,
          action: "disposed",
          old_value: existing?.status,
          new_value: "disposed",
          details: {
            disposal_method: disposalMethod,
            disposal_date: disposalDate.toISOString(),
            disposal_value: disposalValue ? parseFloat(disposalValue) : null,
            notes,
          },
          performed_by: currentUser?.id,
        });
      }
    },
    onSuccess: () => {
      toast.success(`${selectedAssets.length} asset(s) disposed successfully`);
      invalidateAllAssetQueries(queryClient);
      navigate("/assets/allassets");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to dispose assets");
    },
  });

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleDispose = () => {
    disposeMutation.mutate();
  };

  const totalValue = assets
    .filter(a => selectedAssets.includes(a.id))
    .reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0);

  return (
      <div className="p-4 space-y-4">
        {/* Warning Banner */}
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Asset Disposal</p>
            <p className="text-xs text-muted-foreground">
              Disposed assets will be marked as inactive and removed from the active inventory. This action can be reversed by editing the asset.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Asset Selection */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select Assets to Dispose</CardTitle>
              <CardDescription>Choose assets to remove from active inventory</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, tag, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selected Assets Summary */}
              {selectedAssets.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-destructive/10 rounded-lg">
                  <span className="text-sm font-medium">Selected ({selectedAssets.length}):</span>
                  {selectedAssets.map(id => {
                    const asset = assets.find(a => a.id === id);
                    return asset ? (
                      <Badge key={id} variant="destructive" className="gap-1">
                        {asset.asset_tag || asset.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => toggleAsset(id)}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* Assets Table */}
              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Tag/ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow 
                        key={asset.id} 
                        className="cursor-pointer"
                        onClick={() => toggleAsset(asset.id)}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedAssets.includes(asset.id)}
                            onCheckedChange={() => toggleAsset(asset.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.asset_tag || asset.asset_id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{asset.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {asset.purchase_price 
                            ? (() => {
                                const cf = (asset.custom_fields as Record<string, any>) || {};
                                const currency = cf.currency || "INR";
                                const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
                                const symbol = symbols[currency] || "₹";
                                const locale = currency === "INR" ? "en-IN" : "en-US";
                                return `${symbol}${parseFloat(String(asset.purchase_price)).toLocaleString(locale)}`;
                              })()
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {assets.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No assets found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Disposal Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Disposal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAssets.length > 0 && (
                <div className="p-3 bg-accent rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Total Value:</span>{' '}
                    {totalValue.toLocaleString("en-IN")}
                    <span className="text-xs text-muted-foreground ml-1">(mixed currencies possible)</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Disposal Method *</Label>
                <Select value={disposalMethod || undefined} onValueChange={setDisposalMethod}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Disposal Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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

              <div className="space-y-2">
                <Label>Disposal Value (if sold)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={disposalValue}
                  onChange={(e) => setDisposalValue(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add any notes about the disposal..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="pt-4 space-y-2">
                <Button 
                  variant="destructive"
                  className="w-full" 
                  onClick={handleDispose}
                  disabled={selectedAssets.length === 0 || !disposalMethod || disposeMutation.isPending}
                >
                  {disposeMutation.isPending ? "Processing..." : `Dispose ${selectedAssets.length} Asset(s)`}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/assets/allassets")}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default DisposePage;
