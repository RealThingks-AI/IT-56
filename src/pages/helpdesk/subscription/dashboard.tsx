import { Card, CardContent } from "@/components/ui/card";
import { Package, Calendar, AlertTriangle, Users, DollarSign, List } from "lucide-react";
import { SubscriptionsDashboard } from "@/components/Subscriptions/SubscriptionsDashboard";
import { useSubscriptionStats } from "@/hooks/useSubscriptionStats";
import { useNavigate } from "react-router-dom";

export default function SubscriptionOverview() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useSubscriptionStats();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/subscription/tools")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{stats?.activeTools || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Active Subscriptions</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/subscription/tools")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{stats?.pendingRenewals || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pending Renewals</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/subscription/licenses")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{stats?.totalLicenses || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Licenses</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/subscription/vendors")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">{stats?.vendorCount || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Vendors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/subscription/tools")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">{stats?.trialTools || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Trial Subscriptions</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/subscription/tools")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold">{stats?.expiredTools || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/subscription/tools")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <List className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats?.total || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Tools</p>
          </CardContent>
        </Card>
      </div>

      <SubscriptionsDashboard />
    </div>
  );
}
