import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssetModuleTopBar } from "@/components/helpdesk/assets/AssetModuleTopBar";
import { AssetStatCard } from "@/components/helpdesk/assets/AssetStatCard";
import { DashboardCalendar, CalendarEvent } from "@/components/helpdesk/assets/DashboardCalendar";
import { FeedSettingsDropdown, FeedFilters, DEFAULT_FILTERS } from "@/components/helpdesk/assets/FeedSettingsDropdown";
import { ManageDashboardDialog, DashboardPreferences, loadDashboardPreferences } from "@/components/helpdesk/assets/ManageDashboardDialog";
import { Package, DollarSign, CheckCircle2, ShoppingCart, AlertTriangle, Wrench, FileText, Calendar, ChevronRight, Settings2, Bell, ExternalLink } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { format, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];
const AssetDashboard = () => {
  const navigate = useNavigate();
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [preferences, setPreferences] = useState<DashboardPreferences>(loadDashboardPreferences);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  // Fetch all assets
  const {
    data: assets = [],
    isLoading: assetsLoading
  } = useQuery({
    queryKey: ["itam-assets-dashboard-full"],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("itam_assets").select("*, category:itam_categories(id, name)").eq("is_active", true);
      return data || [];
    }
  });

  // Fetch categories
  const {
    data: categories = []
  } = useQuery({
    queryKey: ["itam-categories"],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("itam_categories").select("*").eq("is_active", true);
      return data || [];
    }
  });

  // Fetch recent check-ins from assignments
  const {
    data: recentCheckins = []
  } = useQuery({
    queryKey: ["itam-recent-checkins"],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("itam_asset_assignments").select("*, asset:itam_assets(id, name, asset_tag, asset_id)").not("returned_at", "is", null).order("returned_at", {
        ascending: false
      }).limit(10);
      return data || [];
    }
  });

  // Fetch recent check-outs
  const {
    data: recentCheckouts = []
  } = useQuery({
    queryKey: ["itam-recent-checkouts"],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("itam_asset_assignments").select("*, asset:itam_assets(id, name, asset_tag, asset_id)").is("returned_at", null).order("assigned_at", {
        ascending: false
      }).limit(10);
      return data || [];
    }
  });

  // Fetch repairs in progress
  const {
    data: activeRepairs = []
  } = useQuery({
    queryKey: ["itam-active-repairs"],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("itam_repairs").select("*, asset:itam_assets(id, name, asset_tag, asset_id)").in("status", ["pending", "in_progress"]).order("created_at", {
        ascending: false
      }).limit(10);
      return data || [];
    }
  });

  // Fetch new assets (last 7 days)
  const {
    data: newAssets = []
  } = useQuery({
    queryKey: ["itam-new-assets"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const {
        data
      } = await supabase.from("itam_assets").select("*").eq("is_active", true).gte("created_at", sevenDaysAgo.toISOString()).order("created_at", {
        ascending: false
      }).limit(10);
      return data || [];
    }
  });

  // Fetch disposed assets
  const {
    data: disposedAssets = []
  } = useQuery({
    queryKey: ["itam-disposed-assets"],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("itam_assets").select("*").eq("status", "disposed").order("updated_at", {
        ascending: false
      }).limit(10);
      return data || [];
    }
  });

  // Fetch expiring warranties (next 30 days)
  const {
    data: expiringWarranties = []
  } = useQuery({
    queryKey: ["itam-expiring-warranties"],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const {
        data
      } = await supabase.from("itam_assets").select("*").eq("is_active", true).lte("warranty_expiry", thirtyDaysFromNow.toISOString()).gte("warranty_expiry", new Date().toISOString());
      return data || [];
    }
  });

  // Fetch maintenance due
  const {
    data: maintenanceDue = []
  } = useQuery({
    queryKey: ["itam-maintenance-due"],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("itam_repairs").select("*, asset:itam_assets(id, name, asset_tag)").eq("status", "pending").order("scheduled_date", {
        ascending: true
      }).limit(10);
      return data || [];
    }
  });

  // Calculate stats
  const totalAssets = assets.length;
  const activeAssets = assets.filter(a => a.status !== "disposed" && a.status !== "lost").length;
  const availableAssets = assets.filter(a => a.status === "available").length;
  const totalValue = assets.reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0);
  const checkedOutCount = assets.filter(a => a.status === "in_use").length;
  const underRepairCount = assets.filter(a => a.status === "maintenance").length;
  const disposedCount = assets.filter(a => a.status === "disposed").length;

  // Get fiscal year purchases (assuming fiscal year starts in April)
  const fiscalYearStart = new Date();
  if (fiscalYearStart.getMonth() < 3) {
    fiscalYearStart.setFullYear(fiscalYearStart.getFullYear() - 1);
  }
  fiscalYearStart.setMonth(3, 1);
  fiscalYearStart.setHours(0, 0, 0, 0);
  const fiscalYearPurchases = assets.filter(a => {
    if (!a.purchase_date) return false;
    return new Date(a.purchase_date) >= fiscalYearStart;
  });
  const fiscalYearValue = fiscalYearPurchases.reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0);

  // Calculate category distribution for pie chart
  const categoryData = categories.map(cat => {
    const categoryAssets = assets.filter(a => a.category_id === cat.id);
    const value = categoryAssets.reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0);
    return {
      name: cat.name,
      value: value,
      count: categoryAssets.length
    };
  }).filter(c => c.value > 0);

  // Build calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add warranty expiring events
    expiringWarranties.forEach(asset => {
      if (asset.warranty_expiry) {
        events.push({
          id: `warranty-${asset.id}`,
          date: new Date(asset.warranty_expiry),
          title: asset.asset_tag || asset.name || "Asset",
          type: "warranty",
          assetId: Number(asset.id)
        });
      }
    });

    // Add maintenance due events
    maintenanceDue.forEach(repair => {
      // Use created_at as fallback since scheduled_date may not exist
      const repairDate = (repair as any).scheduled_date || repair.created_at;
      if (repairDate) {
        events.push({
          id: `maintenance-${repair.id}`,
          date: new Date(repairDate),
          title: repair.asset?.asset_tag || "Maintenance",
          type: "maintenance",
          assetId: Number(repair.asset_id)
        });
      }
    });
    return events;
  }, [expiringWarranties, maintenanceDue]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Get enabled widgets
  const enabledWidgets = preferences.widgets.filter(w => w.enabled);

  // Determine active feed tabs based on filters
  const getActiveFeedTabs = () => {
    const tabs: {
      id: string;
      label: string;
    }[] = [];
    if (feedFilters.checkedIn) tabs.push({
      id: "checkedin",
      label: "Checked In"
    });
    if (feedFilters.checkedOut) tabs.push({
      id: "checkedout",
      label: "Checked Out"
    });
    if (feedFilters.underRepair) tabs.push({
      id: "repair",
      label: "Under Repair"
    });
    if (feedFilters.newAssets) tabs.push({
      id: "new",
      label: "New Assets"
    });
    if (feedFilters.disposed) tabs.push({
      id: "disposed",
      label: "Disposed"
    });
    return tabs.length > 0 ? tabs : [{
      id: "checkedin",
      label: "Checked In"
    }];
  };
  const feedTabs = getActiveFeedTabs();

  // Grid column classes for dynamic columns
  const getGridCols = (cols: number) => {
    const gridMap: Record<number, string> = {
      2: "lg:grid-cols-2",
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
      5: "lg:grid-cols-5",
      6: "lg:grid-cols-6"
    };
    return gridMap[cols] || "lg:grid-cols-4";
  };
  const handleGlobalSearch = (query: string) => {
    navigate(`/assets/allassets?search=${encodeURIComponent(query)}`);
  };

  return <div className="min-h-screen bg-background">
      <AssetModuleTopBar 
        onManageDashboard={() => setManageDialogOpen(true)} 
        onSearch={handleGlobalSearch}
        showColumnSettings={false}
        showExport={false}
      />

      <div className="p-4 md:p-6 space-y-6">

        {/* Stats Cards Row */}
        {assetsLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[100px] animate-pulse" />)}
          </div> : <div className={`grid grid-cols-1 sm:grid-cols-2 ${getGridCols(preferences.columns)} gap-4`}>
            {enabledWidgets.map((widget, index) => {
          const animationDelay = index * 50;
          switch (widget.id) {
            case "activeAssets":
              return <AssetStatCard key={widget.id} title="Number of Active Assets" value={activeAssets} subtitle={`Total Assets: ${totalAssets}`} icon={Package} iconBgColor="bg-blue-500" iconColor="text-white" onClick={() => navigate("/assets/allassets")} animationDelay={animationDelay} />;
            case "availableAssets":
              return <AssetStatCard key={widget.id} title="Available Assets" value={availableAssets} subtitle={`Value: ${formatCurrency(assets.filter(a => a.status === "available").reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0))}`} icon={CheckCircle2} iconBgColor="bg-green-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?status=available")} animationDelay={animationDelay} />;
            case "assetValue":
              return <AssetStatCard key={widget.id} title="Value of Assets" value={formatCurrency(totalValue)} subtitle="Total purchase value" icon={DollarSign} iconBgColor="bg-purple-500" iconColor="text-white" animationDelay={animationDelay} />;
            case "fiscalPurchases":
              return <AssetStatCard key={widget.id} title="Purchases in Fiscal Year" value={formatCurrency(fiscalYearValue)} subtitle={`${fiscalYearPurchases.length} assets purchased`} icon={ShoppingCart} iconBgColor="bg-orange-500" iconColor="text-white" animationDelay={animationDelay} />;
            case "checkedOut":
              return <AssetStatCard key={widget.id} title="Checked-out Assets" value={checkedOutCount} subtitle="Currently assigned" icon={Package} iconBgColor="bg-cyan-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?status=assigned")} animationDelay={animationDelay} />;
            case "underRepair":
              return <AssetStatCard key={widget.id} title="Under Repair" value={underRepairCount} subtitle="In maintenance" icon={Wrench} iconBgColor="bg-yellow-500" iconColor="text-white" onClick={() => navigate("/assets/repairs")} animationDelay={animationDelay} />;
            case "disposed":
              return <AssetStatCard key={widget.id} title="Disposed Assets" value={disposedCount} subtitle="Retired assets" icon={Package} iconBgColor="bg-gray-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?status=disposed")} animationDelay={animationDelay} />;
            case "contracts":
              return <AssetStatCard key={widget.id} title="Active Contracts" value={0} subtitle="Under contract" icon={FileText} iconBgColor="bg-indigo-500" iconColor="text-white" onClick={() => navigate("/assets/lists/contracts")} animationDelay={animationDelay} />;
            default:
              return null;
          }
        })}
          </div>}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Value Chart */}
          {preferences.showChart && <Card className="lg:col-span-2 animate-fade-in transition-all duration-200 hover:shadow-md" style={{
          animationDelay: "100ms",
          animationFillMode: "backwards"
        }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Asset Value By Category</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({
                    name,
                    percent
                  }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                          {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Value']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div> : <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No asset data available
                  </div>}
              </CardContent>
            </Card>}

          {/* Feeds Panel */}
          {preferences.showFeeds && <Card className={cn("animate-fade-in transition-all duration-200 hover:shadow-md", !preferences.showChart && "lg:col-span-3")} style={{
          animationDelay: "150ms",
          animationFillMode: "backwards"
        }}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Feeds</CardTitle>
                <FeedSettingsDropdown filters={feedFilters} onFiltersChange={setFeedFilters} />
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue={feedTabs[0]?.id || "checkedin"} className="w-full">
                  <TabsList className={`w-full grid rounded-none border-b`} style={{
                gridTemplateColumns: `repeat(${Math.min(feedTabs.length, 3)}, 1fr)`
              }}>
                    {feedTabs.slice(0, 3).map(tab => <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                        {tab.label}
                      </TabsTrigger>)}
                  </TabsList>

                  <TabsContent value="checkedin" className="mt-0 max-h-[250px] overflow-y-auto">
                    {recentCheckins.length > 0 ? <div className="divide-y">
                        {recentCheckins.map(checkin => <div key={checkin.id} className="p-3 hover:bg-accent cursor-pointer transition-colors duration-150" onClick={() => navigate(`/assets/detail/${checkin.asset_id}`)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{checkin.asset?.asset_tag || checkin.asset?.asset_id}</p>
                                <p className="text-xs text-muted-foreground truncate">{checkin.asset?.name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground whitespace-nowrap">
                                {checkin.returned_at ? format(new Date(checkin.returned_at), 'MMM dd') : ''}
                              </p>
                            </div>
                          </div>)}
                      </div> : <div className="p-8 text-center text-sm text-muted-foreground">
                        No recent check-ins
                      </div>}
                  </TabsContent>

                  <TabsContent value="checkedout" className="mt-0 max-h-[250px] overflow-y-auto">
                    {recentCheckouts.length > 0 ? <div className="divide-y">
                        {recentCheckouts.map(checkout => <div key={checkout.id} className="p-3 hover:bg-accent cursor-pointer transition-colors duration-150" onClick={() => navigate(`/assets/detail/${checkout.asset_id}`)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{checkout.asset?.asset_tag || checkout.asset?.asset_id}</p>
                                <p className="text-xs text-muted-foreground truncate">{checkout.asset?.name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground whitespace-nowrap">
                                {checkout.assigned_at ? format(new Date(checkout.assigned_at), 'MMM dd') : ''}
                              </p>
                            </div>
                          </div>)}
                      </div> : <div className="p-8 text-center text-sm text-muted-foreground">
                        No recent check-outs
                      </div>}
                  </TabsContent>

                  <TabsContent value="repair" className="mt-0 max-h-[250px] overflow-y-auto">
                    {activeRepairs.length > 0 ? <div className="divide-y">
                        {activeRepairs.map(repair => <div key={repair.id} className="p-3 hover:bg-accent cursor-pointer transition-colors duration-150" onClick={() => navigate(`/assets/repairs/detail/${repair.id}`)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{repair.asset?.asset_tag || repair.asset?.asset_id}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">{repair.issue_description}</p>
                              </div>
                              <Badge variant={repair.status === "in_progress" ? "default" : "secondary"} className="text-[10px] shrink-0">
                                {repair.status}
                              </Badge>
                            </div>
                          </div>)}
                      </div> : <div className="p-8 text-center text-sm text-muted-foreground">
                        No assets under repair
                      </div>}
                  </TabsContent>

                  <TabsContent value="new" className="mt-0 max-h-[250px] overflow-y-auto">
                    {newAssets.length > 0 ? <div className="divide-y">
                        {newAssets.map(asset => <div key={asset.id} className="p-3 hover:bg-accent cursor-pointer transition-colors duration-150" onClick={() => navigate(`/assets/detail/${asset.id}`)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{asset.asset_tag || asset.asset_id}</p>
                                <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground whitespace-nowrap">
                                {asset.created_at ? format(new Date(asset.created_at), 'MMM dd') : ''}
                              </p>
                            </div>
                          </div>)}
                      </div> : <div className="p-8 text-center text-sm text-muted-foreground">
                        No new assets
                      </div>}
                  </TabsContent>

                  <TabsContent value="disposed" className="mt-0 max-h-[250px] overflow-y-auto">
                    {disposedAssets.length > 0 ? <div className="divide-y">
                        {disposedAssets.map(asset => <div key={asset.id} className="p-3 hover:bg-accent cursor-pointer transition-colors duration-150" onClick={() => navigate(`/assets/detail/${asset.id}`)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{asset.asset_tag || asset.asset_id}</p>
                                <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
                              </div>
                              <Badge variant="secondary" className="text-[10px] shrink-0">Disposed</Badge>
                            </div>
                          </div>)}
                      </div> : <div className="p-8 text-center text-sm text-muted-foreground">
                        No disposed assets
                      </div>}
                  </TabsContent>
                </Tabs>
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate("/assets/allassets")}>
                    View All <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>}
        </div>

        {/* Alerts Section */}
        {preferences.showAlerts && <Card className="animate-fade-in transition-all duration-200 hover:shadow-md" style={{
        animationDelay: "200ms",
        animationFillMode: "backwards"
      }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* Assets Due */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900 cursor-pointer hover:border-red-400 hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5" onClick={() => navigate("/assets/alerts?type=overdue")}>
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">0</p>
                    <p className="text-xs text-muted-foreground">Assets Due</p>
                  </div>
                </div>

                {/* Maintenance Due */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900 cursor-pointer hover:border-green-400 hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5" onClick={() => navigate("/assets/alerts?type=maintenance")}>
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                    <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{maintenanceDue.length}</p>
                    <p className="text-xs text-muted-foreground">Maintenance Due</p>
                  </div>
                </div>

                {/* Contracts Pending */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900 cursor-pointer hover:border-orange-400 hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5" onClick={() => navigate("/assets/alerts?type=contracts")}>
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/50">
                    <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">0</p>
                    <p className="text-xs text-muted-foreground">Contracts Expiring</p>
                  </div>
                </div>

                {/* Warranty Pending */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900 cursor-pointer hover:border-purple-400 hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5" onClick={() => navigate("/assets/alerts?type=warranty")}>
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{expiringWarranties.length}</p>
                    <p className="text-xs text-muted-foreground">Warranty Expiring</p>
                  </div>
                </div>
              </div>

              {/* Calendar View */}
              {preferences.showCalendar && <div className="border-t pt-4">
                  <DashboardCalendar events={calendarEvents} />
                </div>}
            </CardContent>
          </Card>}
      </div>

      {/* Manage Dashboard Dialog */}
      <ManageDashboardDialog open={manageDialogOpen} onOpenChange={setManageDialogOpen} preferences={preferences} onSave={setPreferences} />
    </div>;
};
export default AssetDashboard;