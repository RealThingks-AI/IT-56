import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Search, Plus, Key, Users, Building2, Mail, Phone, Globe, Wrench, Shield, FileText, Upload, TrendingUp, ClipboardCheck, AlertTriangle, CheckCircle, ExternalLink, MapPin, FolderTree, Briefcase, Package, Pencil, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { TagFormatTab } from "@/components/helpdesk/assets/TagFormatTab";
import { EmailsTab } from "@/components/helpdesk/assets/setup/EmailsTab";
import { PhotoGalleryDialog } from "@/components/helpdesk/assets/PhotoGalleryDialog";
import { DocumentsGalleryDialog } from "@/components/helpdesk/assets/DocumentsGalleryDialog";

export default function AdvancedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("licenses");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Setup config for sites, locations, etc.
  const { sites, locations, categories, departments, makes } = useAssetSetupConfig();
  
  // Dialog states for setup items
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string>("");
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["licenses", "employees", "vendors", "maintenances", "warranties", "contracts", "tools", "setup"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch licenses
  const { data: licenses = [], isLoading: loadingLicenses } = useQuery({
    queryKey: ["itam-licenses-list", search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_licenses")
        .select("*, itam_vendors(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch users/employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["org-users-list"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!userData?.organisation_id) return [];

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("organisation_id", userData.organisation_id)
        .order("full_name");

      return data || [];
    },
  });

  // Fetch vendors
  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["itam-vendors-list", search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_vendors")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

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

  // Filter data based on search
  const filteredLicenses = licenses.filter((license) =>
    search ? license.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  const filteredEmployees = employees.filter((emp) =>
    search 
      ? emp.name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const filteredVendors = vendors.filter((vendor) =>
    search
      ? vendor.name.toLowerCase().includes(search.toLowerCase()) ||
        vendor.contact_email?.toLowerCase().includes(search.toLowerCase())
      : true
  );

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

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
  };

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

  // Setup CRUD operations
  const openAddDialog = (type: string) => {
    setDialogType(type);
    setDialogMode("add");
    setInputValue("");
    setSelectedSiteId("");
    setDialogOpen(true);
  };

  const openEditDialog = (type: string, item: any) => {
    setDialogType(type);
    setDialogMode("edit");
    setSelectedItem(item);
    setInputValue(item.name);
    setSelectedSiteId(item.site_id || "");
    setDialogOpen(true);
  };

  const openDeleteDialog = (type: string, id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const getTableName = (type: string) => {
    const tables: Record<string, string> = {
      site: "itam_sites",
      location: "itam_locations",
      category: "itam_categories",
      department: "itam_departments",
      make: "itam_makes",
    };
    return tables[type];
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      const tableName = getTableName(dialogType);
      
      if (dialogMode === "add") {
        const insertData: Record<string, unknown> = {
          name: inputValue.trim(),
          organisation_id: userData?.organisation_id,
        };
        
        if (dialogType === "location" && selectedSiteId) {
          insertData.site_id = selectedSiteId;
        }
        
        const { error } = await supabase.from(tableName as any).insert(insertData);
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = { name: inputValue.trim() };
        
        if (dialogType === "location") {
          updateData.site_id = selectedSiteId || null;
        }
        
        const { error } = await supabase
          .from(tableName as any)
          .update(updateData)
          .eq("id", selectedItem.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(dialogMode === "add" ? "Added successfully" : "Updated successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-sites"] });
      queryClient.invalidateQueries({ queryKey: ["itam-locations"] });
      queryClient.invalidateQueries({ queryKey: ["itam-categories"] });
      queryClient.invalidateQueries({ queryKey: ["itam-departments"] });
      queryClient.invalidateQueries({ queryKey: ["itam-makes"] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const tableName = getTableName(type);
      const { error } = await supabase.from(tableName as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-sites"] });
      queryClient.invalidateQueries({ queryKey: ["itam-locations"] });
      queryClient.invalidateQueries({ queryKey: ["itam-categories"] });
      queryClient.invalidateQueries({ queryKey: ["itam-departments"] });
      queryClient.invalidateQueries({ queryKey: ["itam-makes"] });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to delete: " + error.message);
      setDeleteDialogOpen(false);
    },
  });

  const renderSetupTable = (items: any[], type: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>NAME</TableHead>
          {type === "location" && <TableHead>SITE</TableHead>}
          <TableHead>STATUS</TableHead>
          <TableHead className="text-right">ACTIONS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={type === "location" ? 4 : 3} className="text-center py-8 text-muted-foreground">
              No {type}s found. Click "Add {type}" to create one.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              {type === "location" && (
                <TableCell>
                  {item.site_id ? (
                    sites.find(s => s.id === item.site_id)?.name || "-"
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              )}
              <TableCell><Badge variant="secondary">Active</Badge></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(type, item)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive" 
                  onClick={() => openDeleteDialog(type, item.id, item.name)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

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
          <h1 className="text-2xl font-bold">Advanced</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearch(""); setStatusFilter("all"); }}>
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 w-auto">
              <TabsTrigger value="licenses" className="shrink-0 gap-1.5">
                <Key className="h-3.5 w-3.5" />
                Licenses
              </TabsTrigger>
              <TabsTrigger value="employees" className="shrink-0 gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Employees
              </TabsTrigger>
              <TabsTrigger value="vendors" className="shrink-0 gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Vendors
              </TabsTrigger>
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
              <TabsTrigger value="tools" className="shrink-0 gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="setup" className="shrink-0 gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Setup
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Licenses Tab */}
          <TabsContent value="licenses" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">License Management</CardTitle>
                    <p className="text-xs text-muted-foreground">{filteredLicenses.length} licenses</p>
                  </div>
                  <Button size="sm" onClick={() => navigate("/assets/licenses/add-license")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add License
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search licenses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-medium">LICENSE NAME</TableHead>
                        <TableHead className="text-xs font-medium">VENDOR</TableHead>
                        <TableHead className="text-xs font-medium">TYPE</TableHead>
                        <TableHead className="text-xs font-medium">SEATS</TableHead>
                        <TableHead className="text-xs font-medium">UTILIZATION</TableHead>
                        <TableHead className="text-xs font-medium">EXPIRY</TableHead>
                        <TableHead className="text-xs font-medium">COST</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingLicenses ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="text-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="text-sm text-muted-foreground">Loading licenses...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredLicenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Key className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No licenses found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLicenses.map((license) => {
                          const seatsTotal = license.seats_total || 1;
                          const seatsAllocated = license.seats_allocated || 0;
                          const utilization = (seatsAllocated / seatsTotal) * 100;
                          return (
                            <TableRow
                              key={license.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => navigate(`/assets/licenses/${license.id}`)}
                            >
                              <TableCell className="font-medium">{license.name}</TableCell>
                              <TableCell className="text-sm">
                                {license.itam_vendors?.name || "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {license.license_type || "License"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {seatsAllocated} / {seatsTotal}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className={`text-xs font-medium ${getUtilizationColor(utilization)}`}>
                                    {utilization.toFixed(0)}%
                                  </div>
                                  <Progress value={utilization} className="h-2" />
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {license.expiry_date
                                  ? format(new Date(license.expiry_date), "MMM d, yyyy")
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {license.cost ? `₹${license.cost.toLocaleString()}` : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Persons/Employees</CardTitle>
                    <p className="text-xs text-muted-foreground">{filteredEmployees.length} records</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-medium">NAME</TableHead>
                        <TableHead className="text-xs font-medium">EMAIL</TableHead>
                        <TableHead className="text-xs font-medium">ROLE</TableHead>
                        <TableHead className="text-xs font-medium">STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingEmployees ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12">
                            <div className="text-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="text-sm text-muted-foreground">Loading employees...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Users className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No employees found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map((employee) => (
                          <TableRow key={employee.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {employee.name || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {employee.email ? (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  {employee.email}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {employee.role || "user"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={employee.status === "active" ? "secondary" : "destructive"} className="text-xs">
                                {employee.status === "active" ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Vendors</CardTitle>
                    <p className="text-xs text-muted-foreground">{filteredVendors.length} vendor records</p>
                  </div>
                  <Button size="sm" onClick={() => navigate("/assets/vendors/add-vendor")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-medium">VENDOR NAME</TableHead>
                        <TableHead className="text-xs font-medium">CONTACT PERSON</TableHead>
                        <TableHead className="text-xs font-medium">EMAIL</TableHead>
                        <TableHead className="text-xs font-medium">PHONE</TableHead>
                        <TableHead className="text-xs font-medium">WEBSITE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingVendors ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <div className="text-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="text-sm text-muted-foreground">Loading vendors...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredVendors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Building2 className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No vendors found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVendors.map((vendor) => (
                          <TableRow
                            key={vendor.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/assets/vendors/detail/${vendor.id}`)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {vendor.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{vendor.contact_name || "—"}</TableCell>
                            <TableCell className="text-sm">
                              {vendor.contact_email ? (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  {vendor.contact_email}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {vendor.contact_phone ? (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  {vendor.contact_phone}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {vendor.website ? (
                                <a
                                  href={vendor.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Globe className="h-3.5 w-3.5" />
                                  Visit
                                </a>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                        <TableHead>Category</TableHead>
                        <TableHead>Expiry Date</TableHead>
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
                                <p className="text-xs text-muted-foreground">{asset.asset_tag}</p>
                              </div>
                            </TableCell>
                            <TableCell>{asset.category?.name || '-'}</TableCell>
                            <TableCell>{format(new Date(asset.warranty_expiry), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={warrantyInfo.variant}>{warrantyInfo.label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {warrantyInfo.status === "expired" 
                                ? `${warrantyInfo.days} days ago` 
                                : `${warrantyInfo.days} days left`}
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
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No warranty records found
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
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Contracts & Licenses</CardTitle>
                    <p className="text-xs text-muted-foreground">{licenses.length} records</p>
                  </div>
                  <Button size="sm" onClick={() => navigate("/assets/licenses/add-license")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contract
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
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
                        <TableHead>Contract Name</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLicenses.map((license) => {
                        const statusInfo = getContractStatus(license.expiry_date);
                        return (
                          <TableRow 
                            key={license.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/assets/licenses/${license.id}`)}
                          >
                            <TableCell className="font-medium">{license.name}</TableCell>
                            <TableCell>{license.itam_vendors?.name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{license.license_type || 'License'}</Badge>
                            </TableCell>
                            <TableCell>
                              {license.expiry_date 
                                ? format(new Date(license.expiry_date), 'MMM dd, yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {license.cost ? `₹${license.cost.toLocaleString()}` : '-'}
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

          {/* Tools Tab */}
          <TabsContent value="tools" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <Card
                className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                onClick={() => navigate("/assets/import-export")}
              >
                <CardHeader className="pb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                    <Upload className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Import / Export</CardTitle>
                  <CardDescription className="text-xs">
                    Bulk import/export assets with proper field mapping
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-7 text-xs">
                    Open Wizard
                  </Button>
                </CardContent>
              </Card>

              <PhotoGalleryDialog />
              <DocumentsGalleryDialog />

              <Card
                className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                onClick={() => navigate("/assets/depreciation")}
              >
                <CardHeader className="pb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Depreciation</CardTitle>
                  <CardDescription className="text-xs">
                    Track asset lifecycle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-7 text-xs">
                    Manage Lifecycle
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                onClick={() => navigate("/assets/repairs")}
              >
                <CardHeader className="pb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                    <Wrench className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Repairs</CardTitle>
                  <CardDescription className="text-xs">
                    Track asset repairs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-7 text-xs">
                    View Repairs
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                onClick={() => navigate("/assets/audit")}
              >
                <CardHeader className="pb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Audit</CardTitle>
                  <CardDescription className="text-xs">
                    View asset change history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-7 text-xs">
                    View Audit Trail
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup" className="mt-4 space-y-4">
            <Tabs defaultValue="sites">
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 w-auto">
                  <TabsTrigger value="sites" className="shrink-0 text-xs">Sites</TabsTrigger>
                  <TabsTrigger value="locations" className="shrink-0 text-xs">Locations</TabsTrigger>
                  <TabsTrigger value="categories" className="shrink-0 text-xs">Categories</TabsTrigger>
                  <TabsTrigger value="departments" className="shrink-0 text-xs">Departments</TabsTrigger>
                  <TabsTrigger value="makes" className="shrink-0 text-xs">Makes</TabsTrigger>
                  <TabsTrigger value="tagformat" className="shrink-0 text-xs">Tag Format</TabsTrigger>
                  <TabsTrigger value="emails" className="shrink-0 text-xs">Emails</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="sites" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Sites</CardTitle>
                      <CardDescription className="text-xs">Manage site locations</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openAddDialog("site")}><Plus className="h-3 w-3 mr-2" />Add Site</Button>
                  </CardHeader>
                  <CardContent>{renderSetupTable(sites, "site")}</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="locations" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Locations</CardTitle>
                      <CardDescription className="text-xs">Manage locations and link them to sites</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openAddDialog("location")}><Plus className="h-3 w-3 mr-2" />Add Location</Button>
                  </CardHeader>
                  <CardContent>{renderSetupTable(locations, "location")}</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="categories" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><FolderTree className="h-4 w-4" />Categories</CardTitle>
                      <CardDescription className="text-xs">Manage asset categories</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openAddDialog("category")}><Plus className="h-3 w-3 mr-2" />Add Category</Button>
                  </CardHeader>
                  <CardContent>{renderSetupTable(categories, "category")}</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="departments" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" />Departments</CardTitle>
                      <CardDescription className="text-xs">Manage departments</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openAddDialog("department")}><Plus className="h-3 w-3 mr-2" />Add Department</Button>
                  </CardHeader>
                  <CardContent>{renderSetupTable(departments, "department")}</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="makes" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Makes</CardTitle>
                      <CardDescription className="text-xs">Manage asset makes</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openAddDialog("make")}><Plus className="h-3 w-3 mr-2" />Add Make</Button>
                  </CardHeader>
                  <CardContent>{renderSetupTable(makes, "make")}</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tagformat" className="mt-4">
                <TagFormatTab />
              </TabsContent>

              <TabsContent value="emails" className="mt-4">
                <EmailsTab />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? "Add" : "Edit"} {dialogType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={`Enter ${dialogType} name`} />
            </div>
            
            {dialogType === "location" && (
              <div className="space-y-2">
                <Label>Site (Optional)</Label>
                <Select 
                  value={selectedSiteId || "__none__"} 
                  onValueChange={(v) => setSelectedSiteId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Site</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link this location to a site. Locations without a site will be available for all sites.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !inputValue.trim()}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {dialogMode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => itemToDelete && deleteMutation.mutate({ type: itemToDelete.type, id: itemToDelete.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
