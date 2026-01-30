import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AssetTopBar } from "@/components/helpdesk/assets/AssetTopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";

const WarrantiesListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch assets with warranty info
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["itam-assets-warranties"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name), make:itam_makes(name)")
        .eq("is_active", true)
        .not("warranty_expiry", "is", null)
        .order("warranty_expiry", { ascending: true });
      return data || [];
    },
  });

  // Calculate warranty status
  const getWarrantyStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const daysUntil = differenceInDays(expiry, new Date());
    
    if (isPast(expiry)) {
      return { status: "expired", label: "Expired", variant: "destructive" as const, days: Math.abs(daysUntil) };
    } else if (daysUntil <= 30) {
      return { status: "expiring", label: "Expiring Soon", variant: "outline" as const, days: daysUntil };
    } else {
      return { status: "active", label: "Active", variant: "secondary" as const, days: daysUntil };
    }
  };

  // Filter assets
  const filteredAssets = assets.filter(asset => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.asset_tag?.toLowerCase().includes(searchLower) ||
        asset.serial_number?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter !== "all") {
      const warrantyInfo = getWarrantyStatus(asset.warranty_expiry);
      if (warrantyInfo.status !== statusFilter) return false;
    }
    
    return true;
  });

  // Count by status
  const expiredCount = assets.filter(a => getWarrantyStatus(a.warranty_expiry).status === "expired").length;
  const expiringCount = assets.filter(a => getWarrantyStatus(a.warranty_expiry).status === "expiring").length;
  const activeCount = assets.filter(a => getWarrantyStatus(a.warranty_expiry).status === "active").length;

  return (
    <div className="min-h-screen bg-background">
      <AssetTopBar />
      
      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="cursor-pointer" onClick={() => setStatusFilter("active")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Warranties</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setStatusFilter("expiring")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringCount}</p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setStatusFilter("expired")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiredCount}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">All Warranties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Make</TableHead>
                    <TableHead>Warranty Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead className="w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => {
                    const warrantyInfo = getWarrantyStatus(asset.warranty_expiry);
                    return (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {asset.asset_tag || asset.asset_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{asset.serial_number || '-'}</TableCell>
                        <TableCell>{asset.make?.name || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(asset.warranty_expiry), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={warrantyInfo.variant}>{warrantyInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {warrantyInfo.status === "expired" 
                            ? `${warrantyInfo.days} days ago`
                            : `${warrantyInfo.days} days`
                          }
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/assets/detail/${asset.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredAssets.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No warranties found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WarrantiesListPage;
