import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingDown, Calculator, Plus, Pencil, Trash2, Loader2, FolderTree, DollarSign, BarChart3, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { StatCard } from "@/components/helpdesk/assets/StatCard";

const METHOD_LABELS: Record<string, string> = {
  straight_line: "Straight-Line",
  declining_balance: "Declining Balance",
  sum_of_years: "Sum-of-Years-Digits",
};

function calculateBookValue(
  cost: number,
  salvagePercent: number,
  usefulLifeYears: number,
  method: string,
  purchaseDate: string
): { bookValue: number; depreciatedPercent: number; annualDepreciation: number } {
  const salvageValue = cost * (salvagePercent / 100);
  const depreciableAmount = cost - salvageValue;
  const daysSincePurchase = differenceInDays(new Date(), new Date(purchaseDate));
  const yearsElapsed = Math.max(0, daysSincePurchase / 365.25);

  if (yearsElapsed >= usefulLifeYears) {
    return { bookValue: salvageValue, depreciatedPercent: 100, annualDepreciation: 0 };
  }

  let bookValue: number;
  let annualDepreciation: number;

  switch (method) {
    case "declining_balance": {
      const rate = 2 / usefulLifeYears;
      bookValue = cost * Math.pow(1 - rate, yearsElapsed);
      bookValue = Math.max(bookValue, salvageValue);
      annualDepreciation = bookValue * rate;
      break;
    }
    case "sum_of_years": {
      const sum = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
      const fullYears = Math.floor(yearsElapsed);
      let accumulated = 0;
      for (let i = 1; i <= fullYears; i++) {
        accumulated += (usefulLifeYears - i + 1) / sum;
      }
      const partialYear = yearsElapsed - fullYears;
      if (fullYears < usefulLifeYears) {
        accumulated += ((usefulLifeYears - fullYears) / sum) * partialYear;
      }
      bookValue = cost - depreciableAmount * Math.min(accumulated, 1);
      bookValue = Math.max(bookValue, salvageValue);
      const currentYear = Math.min(fullYears + 1, usefulLifeYears);
      annualDepreciation = depreciableAmount * ((usefulLifeYears - currentYear + 1) / sum);
      break;
    }
    default: {
      annualDepreciation = depreciableAmount / usefulLifeYears;
      bookValue = cost - annualDepreciation * yearsElapsed;
      bookValue = Math.max(bookValue, salvageValue);
      break;
    }
  }

  const depreciatedPercent = cost > 0 ? ((cost - bookValue) / cost) * 100 : 0;
  return { bookValue, depreciatedPercent, annualDepreciation };
}

export default function DepreciationDashboard({ embedded = false }: { embedded?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$", SGD: "S$", AED: "د.إ", CNY: "¥",
  };
  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || settings.currency || "$";
  const formatCurrency = (amount: number) => `${currencySymbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<any>(null);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetPage, setAssetPage] = useState(1);
  const ASSETS_PER_PAGE = 50;

  const [name, setName] = useState("");
  const [method, setMethod] = useState("straight_line");
  const [usefulLife, setUsefulLife] = useState(5);
  const [salvagePercent, setSalvagePercent] = useState(10);
  const [categoryId, setCategoryId] = useState<string>("");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["depreciation-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_depreciation_profiles")
        .select("*, category:itam_categories(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["itam-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["depreciation-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_assets")
        .select("id, name, asset_tag, purchase_price, purchase_date, category_id, depreciation_method, useful_life_years, salvage_value")
        .eq("is_active", true)
        .not("purchase_price", "is", null)
        .not("purchase_date", "is", null)
        .gt("purchase_price", 0)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const assetsWithDepreciation = useMemo(() => {
    return assets.map((asset) => {
      const matchedProfile = profiles.find(p => p.category_id === asset.category_id);
      const profileMethod = matchedProfile?.method || asset.depreciation_method || "straight_line";
      const profileLife = matchedProfile?.useful_life_years || asset.useful_life_years || 5;
      const profileSalvage = matchedProfile ? Number(matchedProfile.salvage_value_percent) : (asset.salvage_value && asset.purchase_price ? (Number(asset.salvage_value) / Number(asset.purchase_price)) * 100 : 10);

      const { bookValue, depreciatedPercent, annualDepreciation } = calculateBookValue(
        Number(asset.purchase_price),
        profileSalvage,
        profileLife,
        profileMethod,
        asset.purchase_date!
      );

      return {
        ...asset,
        profileName: matchedProfile?.name || null,
        hasProfile: !!matchedProfile,
        profileMethod,
        bookValue,
        depreciatedPercent,
        annualDepreciation,
      };
    });
  }, [assets, profiles]);

  const totalOriginalValue = assetsWithDepreciation.reduce((sum, a) => sum + Number(a.purchase_price), 0);
  const totalCurrentValue = assetsWithDepreciation.reduce((sum, a) => sum + a.bookValue, 0);
  const totalDepreciation = totalOriginalValue - totalCurrentValue;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: name.trim(),
        method,
        useful_life_years: usefulLife,
        salvage_value_percent: salvagePercent,
        category_id: categoryId || null,
      };
      if (editingProfile) {
        const { error } = await supabase.from("itam_depreciation_profiles").update(payload).eq("id", editingProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("itam_depreciation_profiles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProfile ? "Profile updated" : "Profile created");
      queryClient.invalidateQueries({ queryKey: ["depreciation-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["depreciation-assets"] });
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itam_depreciation_profiles").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile deactivated");
      queryClient.invalidateQueries({ queryKey: ["depreciation-profiles"] });
      setDeleteDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openAdd = () => {
    setEditingProfile(null);
    setName("");
    setMethod("straight_line");
    setUsefulLife(5);
    setSalvagePercent(10);
    setCategoryId("");
    setDialogOpen(true);
  };

  const openEdit = (profile: any) => {
    setEditingProfile(profile);
    setName(profile.name);
    setMethod(profile.method);
    setUsefulLife(profile.useful_life_years);
    setSalvagePercent(Number(profile.salvage_value_percent));
    setCategoryId(profile.category_id || "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProfile(null);
  };

  const methodCounts = {
    straight_line: profiles.filter(p => p.method === "straight_line").length,
    declining_balance: profiles.filter(p => p.method === "declining_balance").length,
    sum_of_years: profiles.filter(p => p.method === "sum_of_years").length,
  };

  const linkedCategories = new Set(profiles.filter(p => p.category_id).map(p => p.category_id));

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Calculator} value={profiles.length} label="Active Profiles" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={TrendingDown} value={methodCounts.straight_line} label="Straight-Line" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
        <StatCard icon={BarChart3} value={methodCounts.declining_balance + methodCounts.sum_of_years} label="Accelerated" colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
        <StatCard icon={FolderTree} value={`${linkedCategories.size}/${categories.length}`} label="Categories Linked" colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
      </div>

      {/* Profiles Table */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Depreciation Profiles</span>
            <div className="ml-auto">
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Create Profile
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Name</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Category</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Method</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Useful Life</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Salvage %</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Annual Rate</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <Calculator className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">No depreciation profiles yet</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={openAdd}>
                        <Plus className="h-3 w-3 mr-2" /> Create your first profile
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => {
                  const annualRate = profile.method === "straight_line"
                    ? ((100 - Number(profile.salvage_value_percent)) / profile.useful_life_years).toFixed(1)
                    : profile.method === "declining_balance"
                    ? (200 / profile.useful_life_years).toFixed(1)
                    : "Varies";
                  return (
                    <TableRow key={profile.id} className="transition-colors">
                      <TableCell className="font-medium">{profile.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(profile as any).category?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{METHOD_LABELS[profile.method] || profile.method}</TableCell>
                      <TableCell className="text-sm">{profile.useful_life_years} years</TableCell>
                      <TableCell className="text-sm">{Number(profile.salvage_value_percent)}%</TableCell>
                      <TableCell className="text-sm">{annualRate}%</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(profile)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setProfileToDelete(profile); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Asset Depreciation Summary */}
      {assetsWithDepreciation.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Asset Depreciation Summary</span>
              <div className="relative max-w-xs min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search assets..." value={assetSearch} onChange={(e) => { setAssetSearch(e.target.value); setAssetPage(1); }} className="pl-9 h-8" />
              </div>
              <p className="text-xs text-muted-foreground">
                {assetSearch ? `${assetsWithDepreciation.filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()) || (a.asset_tag || "").toLowerCase().includes(assetSearch.toLowerCase())).length} of ` : ""}{assetsWithDepreciation.length} assets
              </p>
              <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Original: <strong className="text-foreground">{formatCurrency(totalOriginalValue)}</strong></span>
                  <span>Current: <strong className="text-green-600 dark:text-green-400">{formatCurrency(totalCurrentValue)}</strong></span>
                  <span>Depreciated: <strong className="text-destructive">{formatCurrency(totalDepreciation)}</strong></span>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  const rows = assetsWithDepreciation.map(a => ({
                    "Asset": a.name,
                    "Tag": a.asset_tag || "",
                    "Purchase Price": Number(a.purchase_price).toFixed(2),
                    "Purchase Date": a.purchase_date || "",
                    "Profile": a.profileName || "No Profile Applied",
                    "Method": a.profileMethod,
                    "Current Value": a.bookValue.toFixed(2),
                    "Depreciated %": a.depreciatedPercent.toFixed(1),
                    "Annual Depreciation": a.annualDepreciation.toFixed(2),
                  }));
                  const headers = Object.keys(rows[0]);
                  const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String((r as any)[h]).replace(/"/g,'""')}"`).join(","))].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `depreciation_${new Date().toISOString().split("T")[0]}.csv`; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </div>
            </div>
            {(() => {
              const filtered = assetSearch
                ? assetsWithDepreciation.filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()) || (a.asset_tag || "").toLowerCase().includes(assetSearch.toLowerCase()))
                : assetsWithDepreciation;
              const totalPages = Math.ceil(filtered.length / ASSETS_PER_PAGE);
              const paginated = filtered.slice((assetPage - 1) * ASSETS_PER_PAGE, assetPage * ASSETS_PER_PAGE);
              return (
                <>
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Asset</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Tag</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Purchase Price</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Purchase Date</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Profile</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Current Value</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Depreciated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <TrendingDown className="h-8 w-8 text-muted-foreground mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No assets match your search</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginated.map((asset) => (
                        <TableRow key={asset.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{asset.asset_tag || "—"}</TableCell>
                          <TableCell className="text-sm text-right">{formatCurrency(Number(asset.purchase_price))}</TableCell>
                          <TableCell className="text-sm">{asset.purchase_date}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {asset.profileName ? (
                              <span>{asset.profileName}</span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                                No Profile
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-right font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(asset.bookValue)}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <span className={asset.depreciatedPercent >= 90 ? "text-destructive" : asset.depreciatedPercent >= 50 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                              {asset.depreciatedPercent.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 px-1">
                      <p className="text-xs text-muted-foreground">
                        Showing {((assetPage - 1) * ASSETS_PER_PAGE) + 1}–{Math.min(assetPage * ASSETS_PER_PAGE, filtered.length)} of {filtered.length} assets
                      </p>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={assetPage <= 1} onClick={() => setAssetPage(p => p - 1)}>
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">Page {assetPage} of {totalPages}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={assetPage >= totalPages} onClick={() => setAssetPage(p => p + 1)}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Edit Profile" : "Create Depreciation Profile"}</DialogTitle>
            <DialogDescription>Configure a depreciation method for your assets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Profile Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., IT Equipment - 5yr" />
            </div>
            <div className="space-y-2">
              <Label>Asset Category (optional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Link this profile to an asset category for automatic depreciation calculations.</p>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">Straight-Line</SelectItem>
                  <SelectItem value="declining_balance">Declining Balance (200%)</SelectItem>
                  <SelectItem value="sum_of_years">Sum-of-Years-Digits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Useful Life (years)</Label>
                <Input type="number" min={1} max={50} value={usefulLife} onChange={(e) => setUsefulLife(parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>Salvage Value (%)</Label>
                <Input type="number" min={0} max={100} step={0.5} value={salvagePercent} onChange={(e) => setSalvagePercent(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p className="font-medium text-xs text-muted-foreground">Preview ({currencySymbol}100,000 asset)</p>
              <p>Depreciable amount: {formatCurrency(100000 * (1 - salvagePercent / 100))}</p>
              <p>Year 1 depreciation: {
                method === "straight_line"
                  ? formatCurrency((100000 * (1 - salvagePercent / 100)) / usefulLife)
                  : method === "declining_balance"
                  ? formatCurrency(100000 * (2 / usefulLife))
                  : formatCurrency(100000 * (1 - salvagePercent / 100) * (usefulLife / ((usefulLife * (usefulLife + 1)) / 2)))
              }</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate "{profileToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => profileToDelete && deleteMutation.mutate(profileToDelete.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
