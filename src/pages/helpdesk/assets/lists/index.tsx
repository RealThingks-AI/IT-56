import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, ExternalLink, Wrench, Shield, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, isPast } from "date-fns";

export default function ListsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("maintenances");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["maintenances", "warranties", "contracts"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch maintenance records
  const { data: maintenances = [], isLoading: loadingMaintenances } = useQuery({
    queryKey: ["itam-all-maintenances", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("itam_repairs")
        .select("*, asset:itam_assets(id, name, asset_tag, asset_id)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all" && activeTab === "maintenances") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch assets with warranty info
  const { data: assetsWithWarranty = [], isLoading: loadingWarranties } = useQuery({
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

  // Fetch licenses for contracts
  const { data: licenses = [], isLoading: loadingLicenses } = useQuery({
    queryKey: ["itam-licenses-contracts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_licenses")
        .select("*, vendor:itam_vendors(name)")
        .eq("is_active", true)
        .order("expiry_date", { ascending: true });
      return data || [];
    },
  });

  // Filter maintenances
  const filteredMaintenances = maintenances.filter(m => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      m.asset?.name?.toLowerCase().includes(searchLower) ||
      m.asset?.asset_tag?.toLowerCase().includes(searchLower) ||
      m.issue_description?.toLowerCase().includes(searchLower) ||
      m.repair_number?.toLowerCase().includes(searchLower)
    );
  });

  // Warranty status helper
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

  // Filter warranties
  const filteredWarranties = assetsWithWarranty.filter(asset => {
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.asset_tag?.toLowerCase().includes(searchLower) ||
        asset.serial_number?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    if (statusFilter !== "all" && activeTab === "warranties") {
      const warrantyInfo = getWarrantyStatus(asset.warranty_expiry);
      if (warrantyInfo.status !== statusFilter) return false;
    }
    
    return true;
  });

  // Contract status helper
  const getContractStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: "no-expiry", label: "No Expiry", variant: "secondary" as const };
    
    const expiry = new Date(expiryDate);
    const daysUntil = differenceInDays(expiry, new Date());
    
    if (isPast(expiry)) {
      return { status: "expired", label: "Expired", variant: "destructive" as const };
    } else if (daysUntil <= 30) {
      return { status: "expiring", label: "Expiring Soon", variant: "outline" as const };
    } else {
      return { status: "active", label: "Active", variant: "secondary" as const };
    }
  };

  // Filter licenses
  const filteredLicenses = licenses.filter(license => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      license.name?.toLowerCase().includes(searchLower) ||
      license.license_key?.toLowerCase().includes(searchLower) ||
      license.vendor?.name?.toLowerCase().includes(searchLower)
    );
  });

  const getMaintenanceStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Stats
  const maintenancePending = maintenances.filter(m => m.status === "pending").length;
  const maintenanceInProgress = maintenances.filter(m => m.status === "in_progress").length;
  const warrantyExpiring = assetsWithWarranty.filter(a => getWarrantyStatus(a.warranty_expiry).status === "expiring").length;
  const warrantyExpired = assetsWithWarranty.filter(a => getWarrantyStatus(a.warranty_expiry).status === "expired").length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-2xl font-bold">Asset Lists</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearch(""); setStatusFilter("all"); }}>
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 w-auto">
              <TabsTrigger value="maintenances" className="shrink-0 gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Maintenances
              </TabsTrigger>
              <TabsTrigger value="warranties" className="shrink-0 gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Warranties
              </TabsTrigger>
              <TabsTrigger value="contracts" className="shrink-0 gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Contracts
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Maintenances Tab */}
          <TabsContent value="maintenances" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-100">
                    <Wrench className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{maintenancePending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Wrench className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{maintenanceInProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{maintenances.filter(m => m.status === "completed").length}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">All Maintenance Records</CardTitle>
                  <Button size="sm" onClick={() => navigate("/assets/repairs/create")}>
                    <Plus className="h-4 w-4 mr-1" />
                    New Maintenance
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search maintenances..."
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Repair #</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[80px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMaintenances.map((maintenance) => (
                        <TableRow key={maintenance.id}>
                          <TableCell className="font-medium">
                            {maintenance.repair_number || `#${maintenance.id}`}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{maintenance.asset?.name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">
                                {maintenance.asset?.asset_tag || maintenance.asset?.asset_id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {maintenance.issue_description}
                          </TableCell>
                          <TableCell>{getMaintenanceStatusBadge(maintenance.status)}</TableCell>
                          <TableCell>
                            {maintenance.cost ? `₹${parseFloat(String(maintenance.cost)).toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(maintenance.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/assets/repairs/detail/${maintenance.id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredMaintenances.length === 0 && !loadingMaintenances && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No maintenance records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warranties Tab */}
          <TabsContent value="warranties" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="cursor-pointer" onClick={() => setStatusFilter("active")}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{assetsWithWarranty.filter(a => getWarrantyStatus(a.warranty_expiry).status === "active").length}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={() => setStatusFilter("expiring")}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-100">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{warrantyExpiring}</p>
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
                    <p className="text-2xl font-bold">{warrantyExpired}</p>
                    <p className="text-xs text-muted-foreground">Expired</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">All Warranties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      {filteredWarranties.map((asset) => {
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
                      {filteredWarranties.length === 0 && !loadingWarranties && (
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
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="mt-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Software Licenses & Contracts</p>
                  <p className="text-xs text-blue-600">
                    This view shows software licenses. For asset-specific contracts, view the Contracts tab on individual asset details.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{licenses.filter(l => !l.expiry_date || !isPast(new Date(l.expiry_date))).length}</p>
                    <p className="text-xs text-muted-foreground">Active Contracts</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-100">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{licenses.filter(l => {
                      if (!l.expiry_date) return false;
                      const days = differenceInDays(new Date(l.expiry_date), new Date());
                      return days > 0 && days <= 30;
                    }).length}</p>
                    <p className="text-xs text-muted-foreground">Expiring Soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">License Contracts</CardTitle>
                  <Button size="sm" onClick={() => navigate("/assets/licenses")}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add License
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contracts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>License Name</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLicenses.map((license) => {
                        const statusInfo = getContractStatus(license.expiry_date);
                        return (
                          <TableRow key={license.id} className="cursor-pointer" onClick={() => navigate("/assets/licenses")}>
                            <TableCell className="font-medium">{license.name}</TableCell>
                            <TableCell>{license.vendor?.name || '-'}</TableCell>
                            <TableCell>{license.license_type || '-'}</TableCell>
                            <TableCell>
                              {license.seats_allocated}/{license.seats_total}
                            </TableCell>
                            <TableCell>
                              {license.expiry_date 
                                ? format(new Date(license.expiry_date), 'MMM dd, yyyy')
                                : 'No expiry'
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredLicenses.length === 0 && !loadingLicenses && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No contracts found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
