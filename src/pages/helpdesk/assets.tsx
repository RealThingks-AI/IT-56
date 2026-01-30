import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Plus, TrendingDown, DollarSign, AlertCircle, Wrench, CheckCircle } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function HelpdeskAssets() {
  const navigate = useNavigate();

  // Optimized data fetching
  const {
    data: assetData,
    isLoading
  } = useQuery({
    queryKey: ["assets-overview"],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Parallel fetch user context
      const [userData, profileData] = await Promise.all([
        supabase.from("users").select("organisation_id").eq("auth_user_id", user.id).single(), 
        supabase.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle()
      ]);
      const tenantId = profileData.data?.tenant_id || 1;
      const orgId = userData.data?.organisation_id;

      // Build base query
      // @ts-ignore - Bypass deep type inference issue
      let assetsQuery = supabase.from("itam_assets").select("*").eq("is_active", true);
      
      if (orgId) {
        assetsQuery = assetsQuery.eq("organisation_id", orgId);
      } else {
        assetsQuery = assetsQuery.eq("tenant_id", tenantId);
      }

      const assetsResult = await assetsQuery;
      
      return {
        assets: assetsResult.data || [],
        recentEvents: []
      };
    },
    staleTime: 5 * 60 * 1000
  });

  const allAssets = assetData?.assets || [];

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeAssets = allAssets.filter((a: any) => a.status !== 'retired' && a.status !== 'disposed');
    const availableAssets = allAssets.filter((a: any) => a.status === 'available');
    const maintenanceAssets = allAssets.filter((a: any) => a.status === 'in_repair');
    const retiredAssets = allAssets.filter((a: any) => a.status === 'retired');

    // Recently added (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyAdded = allAssets.filter((a: any) => new Date(a.created_at) > thirtyDaysAgo);

    // Warranty expiring soon (next 60 days)
    const sixtyDaysLater = new Date();
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);
    const warrantyExpiring = allAssets.filter((a: any) => 
      a.warranty_expiry && 
      new Date(a.warranty_expiry) <= sixtyDaysLater && 
      new Date(a.warranty_expiry) > new Date()
    );
    
    const totalValue = allAssets.reduce((sum: number, a: any) => sum + (a.purchase_price || 0), 0);
    
    return {
      activeAssets: activeAssets.length,
      availableAssets: availableAssets.length,
      recentlyAdded: recentlyAdded.length,
      maintenanceAssets: maintenanceAssets.length,
      warrantyExpiring: warrantyExpiring.length,
      retiredAssets: retiredAssets.length,
      totalValue,
      netBookValue: totalValue,
      totalDepreciation: 0
    };
  }, [allAssets]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Quick Actions Row */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => navigate("/assets/add")} className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-sm">Add Asset</span>
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Active Assets */}
        <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/20" onClick={() => navigate("/assets/allassets?status=active")}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Active Assets</p>
                <p className="text-2xl font-bold">{metrics.activeAssets}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Assets */}
        <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/20" onClick={() => navigate("/assets/allassets?status=available")}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Available</p>
                <p className="text-2xl font-bold">{metrics.availableAssets}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recently Added */}
        <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/20" onClick={() => navigate("/assets/allassets?recent=30")}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Recently Added</p>
                <p className="text-2xl font-bold">{metrics.recentlyAdded}</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Plus className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Maintenance */}
        <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/20" onClick={() => navigate("/assets/allassets?status=in_repair")}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">In Maintenance</p>
                <p className="text-2xl font-bold">{metrics.maintenanceAssets}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-orange-500/10 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warranty Expiring */}
        <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/20" onClick={() => navigate("/assets/allassets?warranty=expiring")}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Warranty Expiring</p>
                <p className="text-2xl font-bold">{metrics.warrantyExpiring}</p>
                <p className="text-xs text-muted-foreground">Next 60 days</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retired Assets */}
        <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/20" onClick={() => navigate("/assets/allassets?status=retired")}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Retired Assets</p>
                <p className="text-2xl font-bold">{metrics.retiredAssets}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Asset Value */}
        <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/20" onClick={() => navigate("/assets/depreciation")}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Total Value</p>
                <p className="text-xl font-bold">
                  {metrics.totalValue >= 100000 
                    ? `₹${(metrics.totalValue / 100000).toFixed(1)}L`
                    : `₹${metrics.totalValue.toLocaleString("en-IN")}`
                  }
                </p>
              </div>
              <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Book Value */}
        <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/20" onClick={() => navigate("/assets/depreciation")}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Net Book Value</p>
                <p className="text-xl font-bold">
                  {metrics.netBookValue >= 100000 
                    ? `₹${(metrics.netBookValue / 100000).toFixed(1)}L`
                    : `₹${metrics.netBookValue.toLocaleString("en-IN")}`
                  }
                </p>
              </div>
              <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/assets/allassets")}>
              View All Assets
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/assets/licenses")}>
              Manage Licenses
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/assets/vendors")}>
              View Vendors
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/assets/repairs")}>
              Repairs
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/assets/reports")}>
              Reports
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
