import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AssetModuleTopBar } from "@/components/helpdesk/assets/AssetModuleTopBar";
import { GlobalAssetSearch } from "@/components/helpdesk/assets/GlobalAssetSearch";
import { AssetStatCard } from "@/components/helpdesk/assets/AssetStatCard";
import { DashboardCalendar, CalendarEvent } from "@/components/helpdesk/assets/DashboardCalendar";
import { FeedSettingsDropdown, FeedFilters, DEFAULT_FILTERS } from "@/components/helpdesk/assets/FeedSettingsDropdown";
import { ManageDashboardDialog, DashboardPreferences, DEFAULT_PREFERENCES, dbSettingsToPreferences } from "@/components/helpdesk/assets/ManageDashboardDialog";
import { useUISettings } from "@/hooks/useUISettings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package, DollarSign, CheckCircle2, ShoppingCart, AlertTriangle, Wrench,
  Calendar, ChevronRight, Clock, KeyRound, Trash2, Inbox, RefreshCw,
  Plus, ArrowDownToLine, ArrowUpFromLine, FileBarChart, Search, Settings2 } from
"lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const FeedEmptyState = ({ message }: {message: string;}) =>
<div className="flex flex-col items-center justify-center py-4 text-muted-foreground gap-1">
    <Inbox className="h-4 w-4 opacity-40" />
    <p className="text-xs">{message}</p>
  </div>;


const AssetDashboard = () => {
  const navigate = useNavigate();
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { dashboardPreferences: dbDashPrefs, updateDashboardPreferences, isAuthenticated } = useUISettings();
  const [feedFiltersLoaded, setFeedFiltersLoaded] = useState(false);

  useEffect(() => {
    if (dbDashPrefs) {
      const prefs = dbSettingsToPreferences(dbDashPrefs);
      setPreferences(prefs);
      if (!feedFiltersLoaded && dbDashPrefs.feedFilters) {
        const savedFilters = dbDashPrefs.feedFilters;
        // Ensure new filter keys have defaults
        setFeedFilters({ ...DEFAULT_FILTERS, ...savedFilters });
        setFeedFiltersLoaded(true);
      }
    }
  }, [dbDashPrefs, feedFiltersLoaded]);

  const handleFeedFiltersChange = (newFilters: FeedFilters) => {
    setFeedFilters(newFilters);
    if (isAuthenticated && dbDashPrefs) {
      updateDashboardPreferences({ ...dbDashPrefs, feedFilters: newFilters });
    }
  };

  // ── Data queries ──
  const { data: assets = [], isLoading: assetsLoading, refetch: refetchAssets } = useQuery({
    queryKey: ["itam-assets-dashboard-full"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_assets").select("*, category:itam_categories(id, name)").eq("is_active", true);
      return data || [];
    }
  });

  const { data: overdueAssignments = [], refetch: refetchOverdue } = useQuery({
    queryKey: ["itam-overdue-assignments"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from("itam_assets")
        .select("id, asset_tag, asset_id, name, expected_return_date")
        .eq("is_active", true)
        .eq("status", "in_use")
        .lt("expected_return_date", today)
        .not("expected_return_date", "is", null);

      return (data || []).map((asset) => ({
        id: asset.id,
        asset_id: asset.id,
        expected_return_date: asset.expected_return_date,
        asset: {
          id: asset.id,
          name: asset.name,
          asset_tag: asset.asset_tag,
          asset_id: asset.asset_id,
        },
      }));
    }
  });

  const { data: recentCheckins = [], isLoading: checkinsLoading, refetch: refetchCheckins } = useQuery({
    queryKey: ["itam-recent-checkins"],
    queryFn: async () => {
      // Use itam_asset_history instead of assignments - captures ALL check-ins including orphan assets
      const { data } = await supabase
        .from("itam_asset_history")
        .select("id, asset_id, asset_tag, action, old_value, new_value, details, performed_by, created_at")
        .eq("action", "checked_in")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data || data.length === 0) return [];

      // Fetch asset info for categories
      const assetIds = [...new Set(data.map((d) => d.asset_id))];
      const { data: assetData } = await supabase
        .from("itam_assets")
        .select("id, name, asset_tag, asset_id, category:itam_categories(name)")
        .in("id", assetIds);
      const assetMap = new Map((assetData || []).map((a) => [a.id, a]));

      // Resolve performed_by (auth UUID) to user names
      const performerIds = [...new Set(data.map((d) => d.performed_by).filter(Boolean))] as string[];
      let userMap = new Map<string, string>();
      if (performerIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id, auth_user_id, name, email").in("auth_user_id", performerIds);
        (users || []).forEach((u) => { if (u.auth_user_id) userMap.set(u.auth_user_id, u.name || u.email || u.id); });
      }

      return data.map((d) => {
        const asset = assetMap.get(d.asset_id);
        const userName = d.old_value || (d.details as any)?.returned_from || "—";
        return {
          ...d,
          asset,
          user_name: userName,
          performer_name: d.performed_by ? (userMap.get(d.performed_by) || null) : null,
        };
      });
    }
  });

  const { data: recentCheckouts = [], refetch: refetchCheckouts } = useQuery({
    queryKey: ["itam-recent-checkouts"],
    queryFn: async () => {
      // Show currently checked-out assets (current state view - more useful than historical)
      const { data } = await supabase
        .from("itam_assets")
        .select("id, name, asset_tag, asset_id, status, checked_out_to, assigned_to, checked_out_at, updated_at, category:itam_categories(name)")
        .eq("is_active", true)
        .eq("status", "in_use")
        .order("checked_out_at", { ascending: false, nullsFirst: false })
        .limit(20);
      if (!data || data.length === 0) return [];

      // Resolve user names
      const userIds = [...new Set(data.map((d) => d.checked_out_to || d.assigned_to).filter(Boolean))] as string[];
      let userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id, name, email").in("id", userIds);
        userMap = new Map((users || []).map((u) => [u.id, u.name || u.email || u.id]));
      }

      return data.map((d) => {
        const userId = d.checked_out_to || d.assigned_to;
        return {
          ...d,
          assigned_to_name: userId ? (userMap.get(userId) || null) : null,
        };
      });
    }
  });

  const { data: activeRepairs = [], refetch: refetchRepairs } = useQuery({
    queryKey: ["itam-active-repairs"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_repairs").select("*, asset:itam_assets(id, name, asset_tag, asset_id, category:itam_categories(name))").in("status", ["pending", "in_progress"]).order("created_at", { ascending: false }).limit(15);
      return data || [];
    }
  });

  const { data: newAssets = [], refetch: refetchNew } = useQuery({
    queryKey: ["itam-new-assets"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase.from("itam_assets").select("*, category:itam_categories(name)").eq("is_active", true).gte("created_at", sevenDaysAgo.toISOString()).order("created_at", { ascending: false }).limit(15);
      return data || [];
    }
  });

  const { data: disposedAssets = [], refetch: refetchDisposed } = useQuery({
    queryKey: ["itam-disposed-assets"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_assets").select("*, category:itam_categories(name)").eq("status", "disposed").order("updated_at", { ascending: false }).limit(15);
      return data || [];
    }
  });

  const { data: lostAssets = [], refetch: refetchLost } = useQuery({
    queryKey: ["itam-lost-assets"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_assets").select("*, category:itam_categories(name)").eq("status", "lost").order("updated_at", { ascending: false }).limit(15);
      return data || [];
    }
  });

  const { data: expiringWarranties = [], refetch: refetchWarranties } = useQuery({
    queryKey: ["itam-expiring-warranties"],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data } = await supabase.from("itam_assets").select("*").eq("is_active", true).lte("warranty_expiry", thirtyDaysFromNow.toISOString()).gte("warranty_expiry", new Date().toISOString());
      return data || [];
    }
  });

  const { data: allWarrantyAssets = [] } = useQuery({
    queryKey: ["itam-all-warranty-assets-calendar"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_assets").select("id, name, asset_tag, warranty_expiry").eq("is_active", true).not("warranty_expiry", "is", null);
      return data || [];
    }
  });

  const expiringLeases = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    return assets.filter((asset) => {
      const customFields = asset.custom_fields as Record<string, any> | null;
      const leaseExpiry = customFields?.lease_expiry;
      if (!leaseExpiry) return false;
      const expiryDate = new Date(leaseExpiry);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
    });
  }, [assets]);

  const { data: maintenanceDue = [], refetch: refetchMaintenance } = useQuery({
    queryKey: ["itam-maintenance-due"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_repairs").select("*, asset:itam_assets(id, name, asset_tag)").eq("status", "pending").order("started_at", { ascending: true }).limit(15);
      return data || [];
    }
  });

  const { data: expiringLicenses = [], refetch: refetchLicenses } = useQuery({
    queryKey: ["itam-expiring-licenses-dashboard"],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data } = await supabase.from("itam_licenses").select("*").eq("is_active", true).not("expiry_date", "is", null).lte("expiry_date", thirtyDaysFromNow.toISOString()).gte("expiry_date", new Date().toISOString());
      return data || [];
    }
  });

  const { data: activeLicenses = [] } = useQuery({
    queryKey: ["itam-active-licenses-count"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_licenses").select("id, name, expiry_date").eq("is_active", true);
      return data || [];
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
    refetchAssets(), refetchCheckins(), refetchCheckouts(), refetchRepairs(),
    refetchNew(), refetchDisposed(), refetchWarranties(), refetchMaintenance(),
    refetchOverdue(), refetchLicenses(), refetchLost()]
    );
    setLastRefreshed(new Date());
    setIsRefreshing(false);
  };

  // ── Stats ──
  const totalAssets = assets.length;
  const activeAssets = assets.filter((a) => a.status !== "disposed" && a.status !== "lost").length;
  const availableAssets = assets.filter((a) => a.status === "available").length;
  const totalValue = assets.reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0);
  const currenciesUsed = new Set(assets.map((a) => {
    const cf = a.custom_fields as Record<string, any> | null;
    return cf?.currency || "INR";
  }));
  const hasMixedCurrencies = currenciesUsed.size > 1;
  const checkedOutCount = assets.filter((a) => a.status === "in_use").length;
  const underRepairCount = assets.filter((a) => a.status === "maintenance").length;
  const disposedCount = assets.filter((a) => a.status === "disposed").length;

  const fiscalYearStart = new Date();
  if (fiscalYearStart.getMonth() < 3) fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 1);
  fiscalYearStart.setMonth(3, 1);
  fiscalYearStart.setHours(0, 0, 0, 0);
  const fiscalYearPurchases = assets.filter((a) => a.purchase_date && new Date(a.purchase_date) >= fiscalYearStart);
  const fiscalYearValue = fiscalYearPurchases.reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0);

  // ── Category distribution ──
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((a) => {
      const catName = (a.category as any)?.name || "Uncategorized";
      counts[catName] = (counts[catName] || 0) + 1;
    });
    return Object.entries(counts).
    sort((a, b) => b[1] - a[1]).
    slice(0, 6).
    map(([name, count]) => ({ name, count, percent: totalAssets > 0 ? Math.round(count / totalAssets * 100) : 0 }));
  }, [assets, totalAssets]);

  // ── Calendar events ──
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];
    allWarrantyAssets.forEach((asset) => {
      if (asset.warranty_expiry) {
        events.push({ id: `warranty-${asset.id}`, date: new Date(asset.warranty_expiry), title: asset.asset_tag || asset.name || "Asset", type: "warranty", assetId: Number(asset.id), assetTag: asset.asset_tag || undefined });
      }
    });
    overdueAssignments.forEach((assignment) => {
      if ((assignment as any).expected_return_date) {
        events.push({ id: `overdue-${assignment.id}`, date: new Date((assignment as any).expected_return_date), title: assignment.asset?.asset_tag || assignment.asset?.name || "Asset", type: "asset_due", assetId: Number(assignment.asset_id), assetTag: assignment.asset?.asset_tag || undefined });
      }
    });
    maintenanceDue.forEach((repair) => {
      const repairDate = (repair as any).scheduled_date || repair.created_at;
      if (repairDate) {
        events.push({ id: `maintenance-${repair.id}`, date: new Date(repairDate), title: repair.asset?.asset_tag || "Maintenance", type: "maintenance", assetId: Number(repair.asset_id), assetTag: repair.asset?.asset_tag || undefined });
      }
    });
    // License expiry events
    activeLicenses.forEach((lic: any) => {
      if (lic.expiry_date) {
        events.push({ id: `license-${lic.id}`, date: new Date(lic.expiry_date), title: lic.name || "License", type: "license" as any });
      }
    });
    return events;
  }, [allWarrantyAssets, overdueAssignments, maintenanceDue, activeLicenses]);

  const formatCurrency = (value: number, currencyCode?: string) => {
    const code = currencyCode || "INR";
    const locale = code === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const enabledWidgets = preferences.widgets.filter((w) => w.enabled);
  const gridColumns = preferences.columns || 5;

  const getActiveFeedTabs = () => {
    const tabs: {id: string;label: string;}[] = [];
    if (feedFilters.checkedIn) tabs.push({ id: "checkedin", label: "Checked In" });
    if (feedFilters.checkedOut) tabs.push({ id: "checkedout", label: "Checked Out" });
    if (feedFilters.underRepair) tabs.push({ id: "repair", label: "Under Repair" });
    if (feedFilters.newAssets) tabs.push({ id: "new", label: "New Assets" });
    if (feedFilters.disposed) tabs.push({ id: "disposed", label: "Disposed" });
    if (feedFilters.lost) tabs.push({ id: "lost", label: "Lost" });
    return tabs.length > 0 ? tabs : [{ id: "checkedin", label: "Checked In" }];
  };
  const feedTabs = getActiveFeedTabs();

  const [activeTab, setActiveTab] = useState(feedTabs[0]?.id || "checkedin");

  const getRepairDotColor = (status: string) => {
    if (status === "in_progress") return "bg-blue-500";
    if (status === "pending") return "bg-yellow-500";
    return "bg-muted-foreground";
  };

  const BAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500", "bg-cyan-500", "bg-rose-500"];

  const PIE_COLORS = ["#3b82f6", "#10b981", "#a855f7", "#f97316", "#06b6d4", "#f43f5e"];

  // ── Dynamic column headers per tab ──
  const feedColumnHeaders: Record<string, {col1: string;col2: string;col3: string;col4: string;col5: string;}> = {
    checkedin: { col1: "#", col2: "Asset Tag", col3: "User", col4: "Category", col5: "Date" },
    checkedout: { col1: "#", col2: "Asset Tag", col3: "User", col4: "Category", col5: "Date" },
    repair: { col1: "#", col2: "Asset Tag", col3: "Issue", col4: "", col5: "Date" },
    new: { col1: "#", col2: "Asset Tag", col3: "Category", col4: "", col5: "Date" },
    disposed: { col1: "#", col2: "Asset Tag", col3: "Category", col4: "", col5: "Date" },
    lost: { col1: "#", col2: "Asset Tag", col3: "Category", col4: "", col5: "Date" }
  };
  const currentHeaders = feedColumnHeaders[activeTab] || feedColumnHeaders.checkedin;

  // ── Multi-column feed row helper ──
  const FeedRow = ({ tag, col2, col3, col4, date, onClick, index }: {tag: string;col2?: string;col3?: string;col4?: string;date?: string;onClick: () => void;index?: number;}) => {
    const hasCol4 = col4 !== undefined && col4 !== "";
    return hasCol4 ? (
      <div className={cn("grid grid-cols-[minmax(0,0.3fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors duration-100 group", index !== undefined && index % 2 === 1 && "bg-muted/20")} onClick={onClick}>
        <span className="text-[11px] text-muted-foreground tabular-nums">{index !== undefined ? index + 1 : ""}</span>
        <span className="text-xs font-semibold text-foreground truncate font-mono">{tag}</span>
        <span className="text-xs text-muted-foreground truncate">{col2 || "—"}</span>
        <span className="text-xs text-muted-foreground truncate">{col3 || "—"}</span>
        <div className="flex items-center justify-end gap-1">
          {date && <span className="text-[11px] text-muted-foreground tabular-nums">{date}</span>}
          <ChevronRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
        </div>
      </div>
    ) : (
      <div className={cn("grid grid-cols-[minmax(0,0.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors duration-100 group", index !== undefined && index % 2 === 1 && "bg-muted/20")} onClick={onClick}>
        <span className="text-[11px] text-muted-foreground tabular-nums">{index !== undefined ? index + 1 : ""}</span>
        <span className="text-xs font-semibold text-foreground truncate font-mono">{tag}</span>
        <span className="text-xs text-muted-foreground truncate">{col2 || "—"}</span>
        <div className="flex items-center justify-end gap-1">
          {date && <span className="text-[11px] text-muted-foreground tabular-nums">{date}</span>}
          <ChevronRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
        </div>
      </div>
    );
  };


  const gridColsClass = gridColumns === 3 ? "lg:grid-cols-3" : gridColumns === 4 ? "lg:grid-cols-4" : gridColumns === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5";

  return (
    <>
      <AssetModuleTopBar
        showColumnSettings={false}
        showExport={false}
        hideSearchAndAdd />


      <div className="h-full overflow-y-auto bg-background">
        <div className="p-3 space-y-3">
          {/* Search & Add Asset & Manage Dashboard row - below header */}
           <div className="flex items-center gap-2 animate-fade-in" style={{ animationDuration: "350ms" }}>
            <GlobalAssetSearch />
            <Button size="sm" onClick={() => navigate("/assets/add")} className="gap-1.5 h-8 px-3">
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs">Add Asset</span>
            </Button>
            <div className="ml-auto">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setManageDialogOpen(true)}
                      className="h-8 w-8">

                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Manage Dashboard</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          {/* ── Stats Cards ── */}
          {assetsLoading ?
          <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-3", gridColsClass)}>
              {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-[68px] rounded-lg" />)}
            </div> :

          <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-3", gridColsClass)}>
              {enabledWidgets.map((widget, index) => {
              const d = index * 30;
              switch (widget.id) {
                case "activeAssets":
                  return <AssetStatCard key={widget.id} title="Active Assets" value={activeAssets} subtitle={`Total: ${totalAssets}`} icon={Package} iconBgColor="bg-blue-500" iconColor="text-white" onClick={() => navigate("/assets/allassets")} animationDelay={d} />;
                case "availableAssets":
                  return <AssetStatCard key={widget.id} title="Available" value={availableAssets} subtitle={`Value: ${formatCurrency(assets.filter((a) => a.status === "available").reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0))}`} icon={CheckCircle2} iconBgColor="bg-green-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?status=available")} animationDelay={d} />;
                case "assetValue":
                  return <AssetStatCard key={widget.id} title="Total Value" value={formatCurrency(totalValue)} subtitle={hasMixedCurrencies ? "Mixed currencies" : "Purchase value"} icon={DollarSign} iconBgColor="bg-purple-500" iconColor="text-white" onClick={() => navigate("/assets/allassets")} animationDelay={d} />;
                case "fiscalPurchases":
                  return <AssetStatCard key={widget.id} title="Fiscal Year" value={formatCurrency(fiscalYearValue)} subtitle={`${fiscalYearPurchases.length} purchased`} icon={ShoppingCart} iconBgColor="bg-orange-500" iconColor="text-white" onClick={() => navigate("/assets/allassets")} animationDelay={d} />;
                case "checkedOut":
                  return <AssetStatCard key={widget.id} title="Checked Out" value={checkedOutCount} subtitle="Currently assigned" icon={Package} iconBgColor="bg-cyan-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?status=in_use")} animationDelay={d} />;
                case "underRepair":
                  return <AssetStatCard key={widget.id} title="Under Repair" value={underRepairCount} subtitle={`${maintenanceDue.length} pending`} icon={Wrench} iconBgColor="bg-yellow-500" iconColor="text-white" onClick={() => navigate("/assets/repairs")} animationDelay={d} />;
                case "disposed":
                  return <AssetStatCard key={widget.id} title="Disposed" value={disposedCount} subtitle="Retired assets" icon={Trash2} iconBgColor="bg-gray-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?status=disposed")} animationDelay={d} />;
                case "overdueAssets":
                  return <AssetStatCard key={widget.id} title="Overdue" value={overdueAssignments.length} subtitle="Past return date" icon={Clock} iconBgColor="bg-red-500" iconColor="text-white" onClick={() => navigate("/assets/alerts?type=overdue")} animationDelay={d} />;
                case "licenses":
                  return <AssetStatCard key={widget.id} title="Licenses" value={activeLicenses.length} subtitle={`${expiringLicenses.length} expiring`} icon={KeyRound} iconBgColor="bg-indigo-500" iconColor="text-white" onClick={() => navigate("/assets/licenses")} animationDelay={d} />;
                case "warrantyExpiring":
                  return <AssetStatCard key={widget.id} title="Warranty" value={expiringWarranties.length} subtitle="Expiring in 30d" icon={AlertTriangle} iconBgColor="bg-amber-500" iconColor="text-white" onClick={() => navigate("/assets/alerts?type=warranty")} animationDelay={d} />;
                case "leaseExpiring":
                  return <AssetStatCard key={widget.id} title="Lease" value={expiringLeases.length} subtitle="Expiring in 30d" icon={Calendar} iconBgColor="bg-rose-500" iconColor="text-white" onClick={() => navigate("/assets/alerts?type=lease")} animationDelay={d} />;
                default:
                  return null;
              }
            })}
            </div>
          }

          {/* ── Row 2: Activity Feed (50%) | Calendar (50%) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Activity Feed */}
            {preferences.showFeeds &&
            <Card className="animate-fade-in flex flex-col h-[420px]" style={{ animationDelay: "80ms", animationDuration: "350ms", animationFillMode: "backwards" }}>
                <CardHeader className="pb-0 flex flex-row items-center justify-between py-2 px-3 border-b">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity Feed</CardTitle>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} disabled={isRefreshing}>
                            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p className="text-xs">Refresh data</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <FeedSettingsDropdown filters={feedFilters} onFiltersChange={handleFeedFiltersChange} />
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                  {checkinsLoading ?
                <div className="p-3 space-y-1">
                      {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                    </div> :

                <Tabs defaultValue={feedTabs[0]?.id || "checkedin"} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
                      <TabsList className="w-full flex rounded-none border-b bg-transparent overflow-x-auto h-8 px-1 shrink-0">
                        {feedTabs.map((tab) =>
                    <TabsTrigger key={tab.id} value={tab.id} className="text-xs flex-1 min-w-0 px-3 py-1 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">{tab.label}</TabsTrigger>
                    )}
                      </TabsList>

                      {/* Dynamic column headers */}
                      {currentHeaders.col4 ? (
                        <div className="grid grid-cols-[minmax(0,0.3fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] items-center gap-2 px-3 py-1 border-b bg-muted/30">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col1}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col2}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col3}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col4}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-center">{currentHeaders.col5}</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[minmax(0,0.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-2 px-3 py-1 border-b bg-muted/30">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col1}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col2}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col3}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-center">{currentHeaders.col5}</span>
                        </div>
                      )}

                      <ScrollArea className="flex-1">
                        <TabsContent value="checkedin" className="mt-0">
                          {recentCheckins.length > 0 ?
                      <div className="divide-y divide-border/50">
                              {recentCheckins.map((c: any, i: number) =>
                        <FeedRow key={c.id} index={i} tag={c.asset_tag || c.asset?.asset_tag || c.asset?.asset_id || "—"} col2={c.user_name || "—"} col3={(c.asset?.category as any)?.name || "—"} col4={(c.asset?.category as any)?.name || "—"} date={c.created_at ? format(new Date(c.created_at), 'MMM dd, yyyy') : ''} onClick={() => navigate(`/assets/detail/${c.asset?.asset_tag || c.asset?.asset_id}`)} />
                        )}
                            </div> :
                      <FeedEmptyState message="No recent check-ins" />}
                        </TabsContent>

                        <TabsContent value="checkedout" className="mt-0">
                          {recentCheckouts.length > 0 ?
                      <div className="divide-y divide-border/50">
                              {recentCheckouts.map((c: any, i: number) =>
                        <FeedRow key={c.id} index={i} tag={c.asset_tag || c.asset_id || ""} col2={c.assigned_to_name || "—"} col3={(c.category as any)?.name || "—"} col4={(c.category as any)?.name || "—"} date={c.checked_out_at ? format(new Date(c.checked_out_at), 'MMM dd, yyyy') : (c.updated_at ? format(new Date(c.updated_at), 'MMM dd') : '')} onClick={() => navigate(`/assets/detail/${c.asset_tag || c.asset_id}`)} />
                        )}
                            </div> :
                      <FeedEmptyState message="No assets currently checked out" />}
                        </TabsContent>

                        <TabsContent value="repair" className="mt-0">
                          {activeRepairs.length > 0 ?
                      <div className="divide-y divide-border/50">
                              {activeRepairs.map((r: any, i: number) =>
                        <FeedRow key={r.id} index={i} tag={r.asset?.asset_tag || r.asset?.asset_id || ""} col2={r.issue_description?.slice(0, 30) || "—"} col3={r.status} date={r.created_at ? format(new Date(r.created_at), 'MMM dd, yyyy') : ''} onClick={() => navigate(`/assets/repairs/detail/${r.id}`)} />
                        )}
                            </div> :
                      <FeedEmptyState message="No assets under repair" />}
                        </TabsContent>

                        <TabsContent value="new" className="mt-0">
                          {newAssets.length > 0 ?
                      <div className="divide-y divide-border/50">
                              {newAssets.map((a: any, i: number) =>
                        <FeedRow key={a.id} index={i} tag={a.asset_tag || a.asset_id || ""} col2={(a.category as any)?.name || "—"} col3={a.name || "—"} date={a.created_at ? format(new Date(a.created_at), 'MMM dd, yyyy') : ''} onClick={() => navigate(`/assets/detail/${a.asset_tag || a.asset_id}`)} />
                        )}
                            </div> :
                      <FeedEmptyState message="No new assets in 7 days" />}
                        </TabsContent>

                        <TabsContent value="disposed" className="mt-0">
                          {disposedAssets.length > 0 ?
                      <div className="divide-y divide-border/50">
                              {disposedAssets.map((a: any, i: number) =>
                        <FeedRow key={a.id} index={i} tag={a.asset_tag || a.asset_id || ""} col2={(a.category as any)?.name || "—"} col3={a.name || "—"} date={a.updated_at ? format(new Date(a.updated_at), 'MMM dd, yyyy') : ''} onClick={() => navigate(`/assets/detail/${a.asset_tag || a.asset_id}`)} />
                        )}
                            </div> :
                      <FeedEmptyState message="No disposed assets" />}
                        </TabsContent>

                        <TabsContent value="lost" className="mt-0">
                          {lostAssets.length > 0 ?
                      <div className="divide-y divide-border/50">
                              {lostAssets.map((a: any, i: number) =>
                        <FeedRow key={a.id} index={i} tag={a.asset_tag || a.asset_id || ""} col2={(a.category as any)?.name || "—"} col3={a.name || "—"} date={a.updated_at ? format(new Date(a.updated_at), 'MMM dd, yyyy') : ''} onClick={() => navigate(`/assets/detail/${a.asset_tag || a.asset_id}`)} />
                        )}
                            </div> :
                      <FeedEmptyState message="No lost assets" />}
                        </TabsContent>
                      </ScrollArea>
                    </Tabs>
                }
                  <div className="px-3 py-1 border-t shrink-0">
                    <Button variant="ghost" size="sm" className="w-full text-xs h-6" onClick={() => navigate("/assets/allassets")}>
                      View All Assets <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            }

            {/* Alert Calendar */}
            {preferences.showCalendar &&
            <Card className="animate-fade-in flex flex-col h-[420px]" style={{ animationDelay: "100ms", animationDuration: "350ms", animationFillMode: "backwards" }}>
                <CardHeader className="pb-0 py-2 px-3 border-b">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alert Calendar</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-1 flex-1 overflow-auto">
                  <DashboardCalendar events={calendarEvents} />
                </CardContent>
              </Card>
            }
          </div>

          {/* ── Row 3: Assets by Category Pie (50%) | Quick Actions (50%) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Assets by Category — Pie Chart */}
            {!assetsLoading && categoryDistribution.length > 0 &&
            <Card className="animate-fade-in" style={{ animationDelay: "140ms", animationDuration: "350ms", animationFillMode: "backwards" }}>
                <CardHeader className="py-2 px-3 border-b">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assets by Category</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="flex flex-row gap-4 items-center">
                    {/* Left: Donut chart */}
                    <div className="w-[180px] h-[180px] shrink-0 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                          data={categoryDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="name"
                          stroke="none"
                          animationDuration={600}>

                            {categoryDistribution.map((cat, i) =>
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => navigate(`/assets/allassets?category=${encodeURIComponent(cat.name)}`)} />

                          )}
                          </Pie>
                          <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-md px-2.5 py-1.5 text-xs shadow-md">
                                  <p className="font-medium">{d.name}</p>
                                  <p className="text-muted-foreground">{d.count} assets ({d.percent}%)</p>
                                </div>);

                          }} />

                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground leading-none">{totalAssets}</p>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                      </div>
                    </div>
                    {/* Right: Legend with progress bars */}
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0 max-h-[180px] overflow-y-auto pr-1">
                      {categoryDistribution.map((cat, i) =>
                    <div
                      key={cat.name}
                      className="cursor-pointer hover:bg-accent/30 rounded px-2 py-1 transition-colors"
                      onClick={() => navigate(`/assets/allassets?category=${encodeURIComponent(cat.name)}`)}>

                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs truncate flex-1">{cat.name}</span>
                            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{cat.count}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-8 text-right">{cat.percent}%</span>
                          </div>
                          <div className="ml-[18px] mt-0.5 h-1 rounded-full bg-secondary overflow-hidden">
                            <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${cat.percent}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />

                          </div>
                        </div>
                    )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            }

            {/* Quick Actions */}
            <Card className="animate-fade-in" style={{ animationDelay: "160ms", animationDuration: "350ms", animationFillMode: "backwards" }}>
              <CardHeader className="py-2 px-3 border-b">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <Button variant="outline" className="h-11 text-xs font-medium justify-start gap-2.5 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors" onClick={() => navigate("/assets/add")}>
                    <Plus className="h-4 w-4 text-primary" /> Add Asset
                  </Button>
                  <Button variant="outline" className="h-11 text-xs font-medium justify-start gap-2.5 bg-blue-50/50 border-blue-200/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800/30 dark:hover:bg-blue-950/40 transition-colors" onClick={() => navigate("/assets/checkout")}>
                    <ArrowUpFromLine className="h-4 w-4 text-blue-500" /> Check Out
                  </Button>
                  <Button variant="outline" className="h-11 text-xs font-medium justify-start gap-2.5 bg-green-50/50 border-green-200/50 hover:bg-green-50 dark:bg-green-950/20 dark:border-green-800/30 dark:hover:bg-green-950/40 transition-colors" onClick={() => navigate("/assets/checkin")}>
                    <ArrowDownToLine className="h-4 w-4 text-green-500" /> Check In
                  </Button>
                  <Button variant="outline" className="h-11 text-xs font-medium justify-start gap-2.5 bg-purple-50/50 border-purple-200/50 hover:bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800/30 dark:hover:bg-purple-950/40 transition-colors" onClick={() => navigate("/assets/reports")}>
                    <FileBarChart className="h-4 w-4 text-purple-500" /> Reports
                  </Button>
                  <Button variant="outline" className="h-11 text-xs font-medium justify-start gap-2.5 bg-orange-50/50 border-orange-200/50 hover:bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800/30 dark:hover:bg-orange-950/40 transition-colors" onClick={() => navigate("/assets/repairs")}>
                    <Wrench className="h-4 w-4 text-orange-500" /> Repairs
                  </Button>
                  <Button variant="outline" className="h-11 text-xs font-medium justify-start gap-2.5 bg-indigo-50/50 border-indigo-200/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800/30 dark:hover:bg-indigo-950/40 transition-colors" onClick={() => navigate("/assets/licenses")}>
                    <KeyRound className="h-4 w-4 text-indigo-500" /> Licenses
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ManageDashboardDialog open={manageDialogOpen} onOpenChange={setManageDialogOpen} preferences={preferences} onSave={setPreferences} />
    </>);

};

export default AssetDashboard;