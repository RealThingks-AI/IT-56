import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, Plus, Users, Building2, Mail, Phone, Globe, Wrench, Shield,
  TrendingUp, CheckCircle, ExternalLink, MapPin, FolderTree, 
  Briefcase, Package, Pencil, Trash2, Settings, FileBarChart,
  ChevronLeft, ChevronRight, Tag, Loader2, MoreHorizontal,
  Send, Eye, ScrollText, Key, TrendingDown, FileDown, Image, FileText, X
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SortableTableHeader, SortConfig } from "@/components/helpdesk/SortableTableHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchInput } from "@/lib/utils";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";
import { useAssetSetupConfig } from "@/hooks/assets/useAssetSetupConfig";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { EmailsTab } from "@/components/helpdesk/assets/setup/EmailsTab";
import AssetReports from "@/pages/helpdesk/assets/reports";
import AssetLogsPage from "@/pages/helpdesk/assets/AssetLogsPage";


import DepreciationDashboard from "@/pages/helpdesk/assets/depreciation/index";

import DisposePage from "@/pages/helpdesk/assets/dispose";
import AlertsPage from "@/pages/helpdesk/assets/alerts/index";
import ImportExportPage from "@/pages/helpdesk/assets/import-export";


// Extracted components
import { InlinePhotoGallery } from "@/components/helpdesk/assets/InlinePhotoGallery";
import { InlineDocumentsList } from "@/components/helpdesk/assets/InlineDocumentsList";
import { DocumentsStats } from "@/components/helpdesk/assets/DocumentsStats";

// Wrapper components to embed existing pages without their own headers/padding
const DepreciationContent = () => <DepreciationDashboard embedded />;



// Tab configuration for Setup sub-navigation
const SETUP_TABS = [
  { id: "sites", label: "Sites & Locations" },
  { id: "categories", label: "Categories" },
  { id: "departments", label: "Departments" },
  { id: "makes", label: "Makes" },
  { id: "vendors", label: "Vendors" },
] as const;

type SetupTabId = typeof SETUP_TABS[number]["id"];

const ITEMS_PER_PAGE = 50;

import { StatCard } from "@/components/helpdesk/assets/StatCard";


// Shared utilities
import { getAvatarColor } from "@/lib/avatarUtils";
import { StatusDot } from "@/components/helpdesk/assets/StatusDot";
import { PaginationControls } from "@/components/helpdesk/assets/PaginationControls";

// CSV export utility
import { exportCSV } from "@/lib/assets/csvExportUtils";

const VALID_TABS = ["repairs", "warranties", "depreciation", "documents", "emails", "reports", "logs", "dispose", "alerts", "import-export", "setup"] as const;

export default function AdvancedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSystemSettings();
  const currencySymbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const currencySymbol = currencySymbols[settings?.currency] || "$";
  
  // ─── URL-synced tab state (Phase 1: B4, B5, Phase 3: F20) ─────────────────
  const urlTab = searchParams.get("tab");
  const urlSection = searchParams.get("section");
  const activeTab = urlTab && (VALID_TABS as readonly string[]).includes(urlTab) ? urlTab : "repairs";
  const setupSubTab: SetupTabId = (urlSection && SETUP_TABS.some(t => t.id === urlSection) ? urlSection : "sites") as SetupTabId;

  const setActiveTab = useCallback((tab: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      if (tab !== "setup") next.delete("section");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSetupSubTab = useCallback((section: SetupTabId) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", "setup");
      next.set("section", section);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  
  // Isolated search/filter state per tab
  const [vendorSearch, setVendorSearch] = useState("");
  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("all");
  const [warrantySearch, setWarrantySearch] = useState("");
  const [warrantyStatusFilter, setWarrantyStatusFilter] = useState("all");

  // Sorting state
  const [vendorSort, setVendorSort] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [repairSort, setRepairSort] = useState<SortConfig>({ column: "created_at", direction: "desc" });
  const [warrantySort, setWarrantySort] = useState<SortConfig>({ column: "warranty_expiry", direction: "asc" });

  // Pagination state
  const [vendorPage, setVendorPage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [warrantyPage, setWarrantyPage] = useState(1);
  
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

  // Tag format state for unified categories view
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagCategory, setTagCategory] = useState<{ id: string; name: string } | null>(null);
  const [tagPrefix, setTagPrefix] = useState("");
  const [tagPadding, setTagPadding] = useState(4);

  // Fetch tag formats for categories
  const { data: tagFormats = [] } = useQuery({
    queryKey: ["category-tag-formats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("category_tag_formats").select("*");
      if (error) throw error;
      return (data || []) as { id: string; category_id: string; prefix: string; current_number: number; zero_padding: number }[];
    },
    enabled: activeTab === "setup" && setupSubTab === "categories",
  });

  // Fetch asset tags for next-number preview
  const { data: allAssetTags = [] } = useQuery({
    queryKey: ["all-asset-tags-for-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itam_assets").select("asset_tag").not("asset_tag", "is", null);
      if (error) throw error;
      return (data || []).map((a) => a.asset_tag).filter(Boolean) as string[];
    },
    enabled: activeTab === "setup" && setupSubTab === "categories",
  });

  // ─── Asset counts for setup items (Phase 3: F5) ─────────────────────────────
  const { data: setupAssetCounts = { category: {}, department: {}, location: {}, make: {} } } = useQuery({
    queryKey: ["setup-asset-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("itam_assets").select("category_id, department_id, location_id, make_id").eq("is_active", true).eq("is_hidden", false);
      const counts = { category: {} as Record<string, number>, department: {} as Record<string, number>, location: {} as Record<string, number>, make: {} as Record<string, number> };
      (data || []).forEach(a => {
        if (a.category_id) counts.category[a.category_id] = (counts.category[a.category_id] || 0) + 1;
        if (a.department_id) counts.department[a.department_id] = (counts.department[a.department_id] || 0) + 1;
        if (a.location_id) counts.location[a.location_id] = (counts.location[a.location_id] || 0) + 1;
        if (a.make_id) counts.make[a.make_id] = (counts.make[a.make_id] || 0) + 1;
      });
      return counts;
    },
    enabled: activeTab === "setup",
    staleTime: 5 * 60 * 1000,
  });

  const getNextNumberForPrefix = (prefix: string): number => {
    let maxNumber = 0;
    for (const tag of allAssetTags) {
      if (tag.startsWith(prefix)) {
        const num = parseInt(tag.substring(prefix.length), 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    }
    return maxNumber + 1;
  };

  const getTagFormatForCategory = (categoryId: string) => tagFormats.find((tf) => tf.category_id === categoryId);

  const openTagDialog = (cat: { id: string; name: string }) => {
    setTagCategory(cat);
    const existing = getTagFormatForCategory(cat.id);
    if (existing) {
      setTagPrefix(existing.prefix);
      setTagPadding(existing.zero_padding);
    } else {
      setTagPrefix(cat.name.substring(0, 3).toUpperCase() + "-");
      setTagPadding(4);
    }
    setTagDialogOpen(true);
  };

  const saveTagMutation = useMutation({
    mutationFn: async () => {
      if (!tagCategory) throw new Error("No category selected");
      const existing = getTagFormatForCategory(tagCategory.id);
      if (existing) {
        const { error } = await supabase.from("category_tag_formats").update({ prefix: tagPrefix.trim(), zero_padding: tagPadding }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("category_tag_formats").insert({ category_id: tagCategory.id, prefix: tagPrefix.trim(), zero_padding: tagPadding, current_number: 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Tag format saved");
      queryClient.invalidateQueries({ queryKey: ["category-tag-formats"] });
      setTagDialogOpen(false);
    },
    onError: (error: Error) => toast.error("Failed: " + error.message),
  });

  // Reset pagination on search change
  useEffect(() => { setVendorPage(1); }, [vendorSearch]);
  useEffect(() => { setMaintenancePage(1); }, [maintenanceSearch, maintenanceStatusFilter]);
  useEffect(() => { setWarrantyPage(1); }, [warrantySearch, warrantyStatusFilter]);

  // Fetch vendors
  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["itam-vendors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_vendors")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: activeTab === "vendors" || (activeTab === "setup" && setupSubTab === "vendors"),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch maintenance records
  const { data: maintenances = [], isLoading: loadingMaintenances } = useQuery({
    queryKey: ["itam-all-maintenances"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_repairs")
        .select("*, asset:itam_assets(id, name, asset_tag, asset_id), vendor:itam_vendors(id, name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: activeTab === "repairs",
    staleTime: 5 * 60 * 1000,
  });

  // Fetch assets with warranty info
  const { data: assetsWithWarranty = [], isLoading: loadingWarranties } = useQuery({
    queryKey: ["itam-assets-warranties"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name), make:itam_makes(name)")
        .eq("is_active", true)
        .eq("is_hidden", false)
        .not("warranty_expiry", "is", null)
        .order("warranty_expiry", { ascending: true });
      return data || [];
    },
    enabled: activeTab === "warranties",
    staleTime: 5 * 60 * 1000,
  });

  const getWarrantyStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const daysUntil = differenceInDays(expiry, new Date());
    if (isPast(expiry)) {
      return { status: "expired", label: "Expired", variant: "destructive" as const, days: Math.abs(daysUntil) };
    } else if (daysUntil <= 60) {
      return { status: "expiring", label: "Expiring Soon", variant: "outline" as const, days: daysUntil };
    } else {
      return { status: "active", label: "Active", variant: "secondary" as const, days: daysUntil };
    }
  };

  // Vendor asset counts query
  const { data: vendorAssetCounts = {} } = useQuery({
    queryKey: ["vendor-asset-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("vendor_id")
        .eq("is_active", true)
        .eq("is_hidden", false)
        .not("vendor_id", "is", null);
      const counts: Record<string, number> = {};
      data?.forEach((a) => {
        if (a.vendor_id) counts[a.vendor_id] = (counts[a.vendor_id] || 0) + 1;
      });
      return counts;
    },
    enabled: activeTab === "vendors" || (activeTab === "setup" && setupSubTab === "vendors"),
    staleTime: 5 * 60 * 1000,
  });

  // Filter & sort vendors
  const filteredVendors = vendors
    .filter((vendor) => {
      if (!vendorSearch) return true;
      const s = sanitizeSearchInput(vendorSearch).toLowerCase();
      return vendor.name.toLowerCase().includes(s) ||
        vendor.contact_email?.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      const { column, direction } = vendorSort;
      if (!direction) return 0;
      const mult = direction === "asc" ? 1 : -1;
      const valA = ((a as any)[column] || "") as string;
      const valB = ((b as any)[column] || "") as string;
      return valA.localeCompare(valB) * mult;
    });

  const handleVendorSort = (column: string) => {
    setVendorSort(prev => ({
      column,
      direction: prev.column === column ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  };

  // Filter & sort repairs (Phase 3: F4)
  const filteredMaintenances = maintenances.filter(m => {
    if (maintenanceStatusFilter !== "all" && m.status !== maintenanceStatusFilter) return false;
    if (!maintenanceSearch) return true;
    const searchLower = sanitizeSearchInput(maintenanceSearch).toLowerCase();
    return (
      m.asset?.name?.toLowerCase().includes(searchLower) ||
      m.asset?.asset_tag?.toLowerCase().includes(searchLower) ||
      m.issue_description?.toLowerCase().includes(searchLower) ||
      m.repair_number?.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    const { column, direction } = repairSort;
    if (!direction) return 0;
    const mult = direction === "asc" ? 1 : -1;
    if (column === "days_open") {
      const daysA = a.status !== "completed" && a.status !== "cancelled" && a.created_at ? differenceInDays(new Date(), new Date(a.created_at)) : 0;
      const daysB = b.status !== "completed" && b.status !== "cancelled" && b.created_at ? differenceInDays(new Date(), new Date(b.created_at)) : 0;
      return (daysA - daysB) * mult;
    }
    if (column === "asset") {
      return ((a.asset?.name || "").localeCompare(b.asset?.name || "")) * mult;
    }
    const valA = String((a as any)[column] || "");
    const valB = String((b as any)[column] || "");
    return valA.localeCompare(valB) * mult;
  });

  const handleRepairSort = (column: string) => {
    setRepairSort(prev => ({
      column,
      direction: prev.column === column ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  };

  // Filter & sort warranties (Phase 3: F4)
  const filteredWarranties = assetsWithWarranty.filter(asset => {
    if (warrantyStatusFilter !== "all") {
      const warrantyInfo = getWarrantyStatus(asset.warranty_expiry);
      if (warrantyInfo.status !== warrantyStatusFilter) return false;
    }
    if (warrantySearch) {
      const searchLower = sanitizeSearchInput(warrantySearch).toLowerCase();
      const matchesSearch = 
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.asset_tag?.toLowerCase().includes(searchLower) ||
        asset.serial_number?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  }).sort((a, b) => {
    const { column, direction } = warrantySort;
    if (!direction) return 0;
    const mult = direction === "asc" ? 1 : -1;
    if (column === "days") {
      const daysA = getWarrantyStatus(a.warranty_expiry).days;
      const daysB = getWarrantyStatus(b.warranty_expiry).days;
      return (daysA - daysB) * mult;
    }
    if (column === "category") {
      return ((a as any).category?.name || "").localeCompare((b as any).category?.name || "") * mult;
    }
    const valA = String((a as any)[column] || "");
    const valB = String((b as any)[column] || "");
    return valA.localeCompare(valB) * mult;
  });

  const handleWarrantySort = (column: string) => {
    setWarrantySort(prev => ({
      column,
      direction: prev.column === column ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  };

  // Paginated slices
  const vendorTotalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const paginatedVendors = filteredVendors.slice((vendorPage - 1) * ITEMS_PER_PAGE, vendorPage * ITEMS_PER_PAGE);

  const maintenanceTotalPages = Math.ceil(filteredMaintenances.length / ITEMS_PER_PAGE);
  const paginatedMaintenances = filteredMaintenances.slice((maintenancePage - 1) * ITEMS_PER_PAGE, maintenancePage * ITEMS_PER_PAGE);

  const warrantyTotalPages = Math.ceil(filteredWarranties.length / ITEMS_PER_PAGE);
  const paginatedWarranties = filteredWarranties.slice((warrantyPage - 1) * ITEMS_PER_PAGE, warrantyPage * ITEMS_PER_PAGE);

  const getMaintenanceStatusDot = (status: string) => {
    const map: Record<string, { status: "pending" | "in_progress" | "completed" | "cancelled"; label: string }> = {
      open: { status: "pending", label: "Open" },
      pending: { status: "pending", label: "Pending" },
      in_progress: { status: "in_progress", label: "In Progress" },
      completed: { status: "completed", label: "Completed" },
      cancelled: { status: "cancelled", label: "Cancelled" },
    };
    const info = map[status] || { status: "pending" as const, label: status };
    return <StatusDot status={info.status} label={info.label} />;
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
      
      // S1: Input validation - trim and enforce length limits
      const trimmedValue = inputValue.trim();
      if (!trimmedValue || trimmedValue.length === 0) throw new Error("Name is required");
      if (trimmedValue.length > 100) throw new Error("Name must be 100 characters or less");
      
      const tableName = getTableName(dialogType);
      if (dialogMode === "add") {
        if (dialogType === "category") {
          const { data: existing } = await supabase
            .from("itam_categories")
            .select("id, name, is_active")
            .ilike("name", trimmedValue);
          if (existing && existing.length > 0) {
            const activeMatch = existing.find(e => e.is_active);
            if (activeMatch) {
              throw new Error(`A category named "${activeMatch.name}" already exists`);
            }
            throw new Error(`A category named "${existing[0].name}" exists but is inactive. Please reactivate it instead of creating a duplicate.`);
          }
        }
        const insertData: Record<string, unknown> = { name: trimmedValue };
        if (dialogType === "location" && selectedSiteId) insertData.site_id = selectedSiteId;
        const { error } = await supabase.from(tableName as any).insert(insertData);
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = { name: trimmedValue };
        if (dialogType === "location") updateData.site_id = selectedSiteId || null;
        const { error } = await supabase.from(tableName as any).update(updateData).eq("id", selectedItem.id);
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
      queryClient.invalidateQueries({ queryKey: ["setup-asset-counts"] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const tableName = getTableName(type);
      const { error } = await supabase
        .from(tableName as any)
        .update({ is_active: false, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-sites"] });
      queryClient.invalidateQueries({ queryKey: ["itam-locations"] });
      queryClient.invalidateQueries({ queryKey: ["itam-categories"] });
      queryClient.invalidateQueries({ queryKey: ["itam-departments"] });
      queryClient.invalidateQueries({ queryKey: ["itam-makes"] });
      queryClient.invalidateQueries({ queryKey: ["setup-asset-counts"] });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to deactivate: " + error.message);
      setDeleteDialogOpen(false);
    },
  });

  // Stats calculations
  const maintenancePending = maintenances.filter(m => m.status === "open" || m.status === "pending").length;
  const maintenanceInProgress = maintenances.filter(m => m.status === "in_progress").length;
  const maintenanceCompleted = maintenances.filter(m => m.status === "completed").length;
  const warrantyExpiring = assetsWithWarranty.filter(a => getWarrantyStatus(a.warranty_expiry).status === "expiring").length;
  const warrantyExpired = assetsWithWarranty.filter(a => getWarrantyStatus(a.warranty_expiry).status === "expired").length;
  const warrantyActive = assetsWithWarranty.filter(a => getWarrantyStatus(a.warranty_expiry).status === "active").length;

  const getSetupItems = () => {
    switch (setupSubTab) {
      case "sites": return sites;
      case "categories": return categories;
      case "departments": return departments;
      case "makes": return makes;
      default: return [];
    }
  };

  const getSetupType = () => {
    const typeMap: Record<string, string> = {
      sites: "site", categories: "category",
      departments: "department", makes: "make", emails: "", "activity-log": "",
    };
    return typeMap[setupSubTab] || "";
  };

  // Get asset count for a setup item
  const getSetupItemAssetCount = (type: string, id: string): number => {
    const countMap: Record<string, Record<string, number>> = {
      site: setupAssetCounts.location,
      location: setupAssetCounts.location,
      category: setupAssetCounts.category,
      department: setupAssetCounts.department,
      make: setupAssetCounts.make,
    };
    return countMap[type]?.[id] || 0;
  };

  const renderSetupTable = (items: any[], type: string) => (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="font-medium text-xs uppercase text-muted-foreground">Name</TableHead>
          {type === "location" && <TableHead className="font-medium text-xs uppercase text-muted-foreground">Site</TableHead>}
          <TableHead className="font-medium text-xs uppercase text-muted-foreground">Assets</TableHead>
          <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
          <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={type === "location" ? 5 : 4} className="text-center py-10 text-muted-foreground">
              No {type}s found. Click "Add {type}" to create one.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium text-xs">{item.name}</TableCell>
              {type === "location" && (
                <TableCell className="text-xs">
                  {item.site_id ? (sites.find(s => s.id === item.site_id)?.name || "-") : <span className="text-muted-foreground">-</span>}
                </TableCell>
              )}
              <TableCell className="text-xs text-muted-foreground">{getSetupItemAssetCount(type, item.id)}</TableCell>
              <TableCell><StatusDot status="active" label="Active" /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(type, item)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openDeleteDialog(type, item.id, item.name)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderCategoriesTable = () => (
    <>
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Manage asset categories and tag format prefixes</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => exportCSV(categories.map(cat => {
                const tf = getTagFormatForCategory(cat.id);
                return { Category: cat.name, Prefix: tf?.prefix || "—", Padding: tf?.zero_padding || "—", Assets: getSetupItemAssetCount("category", cat.id) };
              }), "categories")}>
                <FileDown className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => openAddDialog("category")}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Category
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Category</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Prefix</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Padding</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Next Tag (Preview)</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Assets</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No categories found. Click "Add Category" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => {
                  const tf = getTagFormatForCategory(cat.id);
                  return (
                    <TableRow key={cat.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-xs">{cat.name}</TableCell>
                      <TableCell className="text-xs">
                        {tf ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tf.prefix}</code> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">{tf ? tf.zero_padding : "—"}</TableCell>
                      <TableCell>
                        {tf ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {tf.prefix}{getNextNumberForPrefix(tf.prefix).toString().padStart(tf.zero_padding, "0")}
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{getSetupItemAssetCount("category", cat.id)}</TableCell>
                      <TableCell><StatusDot status="active" label="Active" /></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog("category", cat)} title="Edit name">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openTagDialog(cat)} title="Configure tag format">
                          <Tag className="h-3 w-3" />
                          {tf ? "Edit Tag" : "Set Tag"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openDeleteDialog("category", cat.id, cat.name)}>
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

      {/* Tag Format Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Tag Format: {tagCategory?.name}</DialogTitle>
            <DialogDescription>Set the prefix and padding for auto-generated asset tags.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Input value={tagPrefix} onChange={(e) => setTagPrefix(e.target.value.toUpperCase())} placeholder="e.g., LAP-" />
              <p className="text-xs text-muted-foreground">The prefix before the number (e.g., "LAP-" for Laptops)</p>
            </div>
            <div className="space-y-2">
              <Label>Number Padding</Label>
              <Input type="number" min={1} max={8} value={tagPadding} onChange={(e) => setTagPadding(parseInt(e.target.value) || 4)} />
              <p className="text-xs text-muted-foreground">How many digits to pad (e.g., 4 → 0001, 0002)</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs">Preview</Label>
              <p className="text-lg font-mono mt-1">{tagPrefix ? `${tagPrefix}${"1".padStart(tagPadding, "0")}` : "—"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveTagMutation.mutate()} disabled={saveTagMutation.isPending || !tagPrefix.trim()}>
              {saveTagMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  const renderSitesLocationsTable = () => {
    type UnifiedRow = { id: string; name: string; rowType: "site" | "location"; parentSiteName: string | null; site_id?: string | null };
    const rows: UnifiedRow[] = [];

    sites.forEach((s) => rows.push({ id: s.id, name: s.name, rowType: "site", parentSiteName: null }));

    const locationsWithSite = locations.filter((l) => l.site_id);
    const locationsWithoutSite = locations.filter((l) => !l.site_id);

    sites.forEach((s) => {
      locationsWithSite
        .filter((l) => l.site_id === s.id)
        .forEach((l) => rows.push({ id: l.id, name: l.name, rowType: "location", parentSiteName: s.name, site_id: l.site_id }));
    });

    locationsWithoutSite.forEach((l) => rows.push({ id: l.id, name: l.name, rowType: "location", parentSiteName: null, site_id: null }));

    return (
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Manage sites and locations</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                type UnifiedRow = { name: string; type: string; parentSite: string; assets: number };
                const exportRows: UnifiedRow[] = [];
                sites.forEach(s => exportRows.push({ name: s.name, type: "Site", parentSite: "—", assets: getSetupItemAssetCount("site", s.id) }));
                locations.forEach(l => exportRows.push({ name: l.name, type: "Location", parentSite: l.site_id ? (sites.find(s => s.id === l.site_id)?.name || "—") : "—", assets: getSetupItemAssetCount("location", l.id) }));
                exportCSV(exportRows.map(r => ({ Name: r.name, Type: r.type, "Parent Site": r.parentSite, Assets: r.assets })), "sites-locations");
              }}>
                <FileDown className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddDialog("location")}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Location
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => openAddDialog("site")}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Site
              </Button>
            </div>
          </div>
          <Table>
             <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Name</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Type</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Parent Site</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Assets</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No sites or locations found. Add a site or location to get started.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={`${row.rowType}-${row.id}`}>
                    <TableCell className="font-medium text-xs">{row.name}</TableCell>
                    <TableCell>
                      <span className="text-xs capitalize">{row.rowType}</span>
                    </TableCell>
                    <TableCell>
                      {row.rowType === "location" && row.parentSiteName ? (
                        row.parentSiteName
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{getSetupItemAssetCount(row.rowType, row.id)}</TableCell>
                    <TableCell><StatusDot status="active" label="Active" /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(row.rowType === "site" ? "site" : "location", 
                          row.rowType === "site" 
                            ? sites.find((s) => s.id === row.id) 
                            : locations.find((l) => l.id === row.id)
                        )}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => openDeleteDialog(row.rowType === "site" ? "site" : "location", row.id, row.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderVendorsSetupContent = () => (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Manage vendors</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportCSV(filteredVendors.map(v => ({ 
              Name: v.name, 
              Contact: v.contact_name || "", 
              Email: v.contact_email || "", 
              Phone: v.contact_phone || "", 
              Website: v.website || "",
              "Asset Count": vendorAssetCounts[v.id] || 0,
            })), "vendors")}>
              <FileDown className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button size="sm" onClick={() => navigate("/assets/vendors/add-vendor")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="pl-7 pr-8 h-7 text-xs" />
          {vendorSearch && (
            <button onClick={() => setVendorSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Table>
           <TableHeader className="bg-muted">
            <TableRow>
              <SortableTableHeader column="name" label="Vendor Name" sortConfig={vendorSort} onSort={handleVendorSort} />
              <SortableTableHeader column="contact_name" label="Contact Person" sortConfig={vendorSort} onSort={handleVendorSort} />
              <SortableTableHeader column="contact_email" label="Email" sortConfig={vendorSort} onSort={handleVendorSort} />
              <TableHead className="font-medium text-xs uppercase text-muted-foreground">Phone</TableHead>
              <TableHead className="font-medium text-xs uppercase text-muted-foreground">Website</TableHead>
              <TableHead className="font-medium text-xs uppercase text-muted-foreground">Assets</TableHead>
              <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingVendors ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Loading vendors...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center">
                    <Building2 className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No vendors found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedVendors.map((vendor) => (
                <TableRow key={vendor.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/assets/vendors/detail/${vendor.id}`)}>
                  <TableCell className="font-medium text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {vendor.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{vendor.contact_name || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {vendor.contact_email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {vendor.contact_email}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {vendor.contact_phone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {vendor.contact_phone}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {vendor.website && (vendor.website.startsWith("http://") || vendor.website.startsWith("https://")) ? (
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        <Globe className="h-3 w-3" />
                        Visit
                      </a>
                    ) : vendor.website ? (
                      <span className="text-xs text-muted-foreground">{vendor.website}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      {vendorAssetCounts[vendor.id] || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/assets/vendors/detail/${vendor.id}`); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {vendor.contact_email && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`mailto:${vendor.contact_email}`, '_blank'); }}>
                            <Send className="h-4 w-4 mr-2" />
                            Email Vendor
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PaginationControls currentPage={vendorPage} totalPages={vendorTotalPages} totalItems={filteredVendors.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setVendorPage} />
      </CardContent>
    </Card>
  );

  const renderSetupContent = () => {
    const type = getSetupType();
    const items = getSetupItems();
    const tabConfig = SETUP_TABS.find(t => t.id === setupSubTab);

    if (setupSubTab === "sites") return renderSitesLocationsTable();
    if (setupSubTab === "categories") return renderCategoriesTable();
    // emails moved to top-level tab
    if (setupSubTab === "vendors") return renderVendorsSetupContent();

    return (
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Manage {tabConfig?.label.toLowerCase()}</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => exportCSV(items.map(item => ({
                Name: item.name, Assets: getSetupItemAssetCount(type, item.id),
              })), type + "s")}>
                <FileDown className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => openAddDialog(type)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            </div>
          </div>
          {renderSetupTable(items, type)}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Sticky tabs with scroll fade indicator */}
        <div className="sticky top-0 z-30 bg-background border-b px-3 py-2">
          <div className="relative">
            <TabsList className="h-9 bg-muted rounded-lg p-1 w-full justify-start gap-1 overflow-x-auto overflow-y-hidden scrollbar-none">
              <TabsTrigger value="repairs" className="text-xs flex-shrink-0">Repairs</TabsTrigger>
              <TabsTrigger value="warranties" className="text-xs flex-shrink-0">Warranties</TabsTrigger>
              <TabsTrigger value="depreciation" className="text-xs flex-shrink-0">Depreciation</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs flex-shrink-0">Documents</TabsTrigger>
              <TabsTrigger value="emails" className="text-xs flex-shrink-0">Emails</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs flex-shrink-0">Reports</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs flex-shrink-0">Logs</TabsTrigger>
              
              <TabsTrigger value="dispose" className="text-xs flex-shrink-0">Dispose</TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs flex-shrink-0">Alerts</TabsTrigger>
              <TabsTrigger value="import-export" className="text-xs flex-shrink-0">Import/Export</TabsTrigger>
              <TabsTrigger value="setup" className="text-xs flex-shrink-0">Setup</TabsTrigger>
            </TabsList>
            {/* Fade gradient for scroll indicator */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent lg:hidden" />
          </div>
        </div>

        {/* Secondary Navigation for Setup Tab */}
        {activeTab === "setup" && (
          <div className="border-b px-3 py-2 flex flex-wrap gap-1.5 bg-background">
            {SETUP_TABS.map((tab) => {
              const isActive = setupSubTab === tab.id;
              const countMap: Record<string, number> = {
                sites: sites.length,
                categories: categories.length,
                departments: departments.length,
                makes: makes.length,
                vendors: vendors.length,
              };
              const count = countMap[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setSetupSubTab(tab.id)}
                  className={`h-7 px-3 rounded-md text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  {tab.label}{count !== undefined ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-3">
          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-0 animate-in fade-in-0 duration-200">
            <AssetLogsPage />
          </TabsContent>


          {/* Dispose Tab */}
          <TabsContent value="dispose" className="mt-0 animate-in fade-in-0 duration-200 -mx-3 -mb-3">
            <DisposePage />
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-0 animate-in fade-in-0 duration-200">
            <AlertsPage />
          </TabsContent>

          {/* Import/Export Tab */}
          <TabsContent value="import-export" className="mt-0 animate-in fade-in-0 duration-200">
            <ImportExportPage embedded />
          </TabsContent>


          {/* Repairs Tab */}
          <TabsContent value="repairs" className="mt-0 space-y-2.5 animate-in fade-in-0 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              <StatCard icon={Wrench} value={maintenancePending} label="Pending" colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                onClick={() => { setMaintenanceStatusFilter(maintenanceStatusFilter === "pending" ? "all" : "pending"); setMaintenancePage(1); }}
                active={maintenanceStatusFilter === "pending" || maintenanceStatusFilter === "open"} />
              <StatCard icon={Settings} value={maintenanceInProgress} label="In Progress" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                onClick={() => { setMaintenanceStatusFilter(maintenanceStatusFilter === "in_progress" ? "all" : "in_progress"); setMaintenancePage(1); }}
                active={maintenanceStatusFilter === "in_progress"} />
              <StatCard icon={CheckCircle} value={maintenanceCompleted} label="Completed" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                onClick={() => { setMaintenanceStatusFilter(maintenanceStatusFilter === "completed" ? "all" : "completed"); setMaintenancePage(1); }}
                active={maintenanceStatusFilter === "completed"} />
            </div>

            <Card>
              <CardContent className="pt-3 space-y-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                   <div className="relative flex-1 max-w-sm min-w-[200px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search repairs..." value={maintenanceSearch} onChange={(e) => setMaintenanceSearch(e.target.value)} className="pl-7 pr-8 h-7 text-xs" />
                    {maintenanceSearch && (
                      <button onClick={() => setMaintenanceSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Select value={maintenanceStatusFilter} onValueChange={v => { setMaintenanceStatusFilter(v); setMaintenancePage(1); }}>
                    <SelectTrigger className="w-[140px] h-7 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => exportCSV(filteredMaintenances.map(m => ({
                      "Repair #": m.repair_number || "",
                      Asset: m.asset?.name || "",
                      "Asset Tag": m.asset?.asset_tag || "",
                      Issue: m.issue_description || "",
                      Vendor: (m as any).vendor?.name || "",
                      Cost: m.cost || "",
                      Diagnosis: m.diagnosis || "",
                      Status: m.status || "",
                      Created: m.created_at ? format(new Date(m.created_at), "yyyy-MM-dd") : "",
                      "Days Open": m.status !== "completed" && m.status !== "cancelled" && m.created_at
                        ? differenceInDays(new Date(), new Date(m.created_at))
                        : "",
                    })), "repairs")}>
                      <FileDown className="h-3.5 w-3.5 mr-1" />
                      Export
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={() => navigate("/assets/repairs/create")}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      New Record
                    </Button>
                  </div>
                </div>

                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <SortableTableHeader column="repair_number" label="Repair #" sortConfig={repairSort} onSort={handleRepairSort} />
                      <SortableTableHeader column="asset" label="Asset" sortConfig={repairSort} onSort={handleRepairSort} />
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground">Issue</TableHead>
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground">Vendor</TableHead>
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground">Cost</TableHead>
                      <SortableTableHeader column="status" label="Status" sortConfig={repairSort} onSort={handleRepairSort} />
                      <SortableTableHeader column="created_at" label="Created" sortConfig={repairSort} onSort={handleRepairSort} />
                      <SortableTableHeader column="days_open" label="Days Open" sortConfig={repairSort} onSort={handleRepairSort} />
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMaintenances ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`skel-repair-${i}`}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-6 rounded" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedMaintenances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center">
                            <Wrench className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                            <p className="text-sm text-muted-foreground">No repair records found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMaintenances.map((maintenance) => {
                        const daysOpen = maintenance.status !== "completed" && maintenance.status !== "cancelled" && maintenance.created_at
                          ? differenceInDays(new Date(), new Date(maintenance.created_at))
                          : null;
                        return (
                          <TableRow key={maintenance.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/assets/repairs/detail/${maintenance.id}`)}>
                            <TableCell className="font-medium text-xs">{maintenance.repair_number || "RPR-UNKNOWN"}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-xs font-medium">{maintenance.asset?.name || '—'}</p>
                                <p className="text-[11px] text-muted-foreground">{maintenance.asset?.asset_tag || ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs">{maintenance.issue_description || '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{(maintenance as any).vendor?.name || '—'}</TableCell>
                            <TableCell className="text-xs">{maintenance.cost ? `${currencySymbol}${Number(maintenance.cost).toLocaleString()}` : '—'}</TableCell>
                            <TableCell>{getMaintenanceStatusDot(maintenance.status)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {maintenance.created_at ? format(new Date(maintenance.created_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {daysOpen !== null ? (
                                <span className={daysOpen > 14 ? "text-destructive font-medium" : daysOpen > 7 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                                  {daysOpen}d
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/assets/repairs/detail/${maintenance.id}`); }}>
                                    <Eye className="h-4 w-4 mr-2" /> View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <PaginationControls currentPage={maintenancePage} totalPages={maintenanceTotalPages} totalItems={filteredMaintenances.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setMaintenancePage} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warranties Tab */}
          <TabsContent value="warranties" className="mt-0 space-y-2.5 animate-in fade-in-0 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              <StatCard icon={CheckCircle} value={warrantyActive} label="Active" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                onClick={() => { setWarrantyStatusFilter(warrantyStatusFilter === "active" ? "all" : "active"); setWarrantyPage(1); }}
                active={warrantyStatusFilter === "active"} />
              <StatCard icon={Shield} value={warrantyExpiring} label="Expiring Soon" colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                onClick={() => { setWarrantyStatusFilter(warrantyStatusFilter === "expiring" ? "all" : "expiring"); setWarrantyPage(1); }}
                active={warrantyStatusFilter === "expiring"} />
              <StatCard icon={Shield} value={warrantyExpired} label="Expired" colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                onClick={() => { setWarrantyStatusFilter(warrantyStatusFilter === "expired" ? "all" : "expired"); setWarrantyPage(1); }}
                active={warrantyStatusFilter === "expired"} />
            </div>

            <Card>
              <CardContent className="pt-3 space-y-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                   <div className="relative flex-1 max-w-sm min-w-[200px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search warranties..." value={warrantySearch} onChange={(e) => setWarrantySearch(e.target.value)} className="pl-7 pr-8 h-7 text-xs" />
                    {warrantySearch && (
                      <button onClick={() => setWarrantySearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Select value={warrantyStatusFilter} onValueChange={v => { setWarrantyStatusFilter(v); setWarrantyPage(1); }}>
                    <SelectTrigger className="w-[140px] h-7 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expiring">Expiring Soon</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="ml-auto">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => exportCSV(filteredWarranties.map(a => ({
                      Asset: a.name, Tag: a.asset_tag || "", Category: (a as any).category?.name || "",
                      Make: (a as any).make?.name || "", Model: a.model || "",
                      "Expiry Date": a.warranty_expiry ? format(new Date(a.warranty_expiry), "yyyy-MM-dd") : "",
                      Status: getWarrantyStatus(a.warranty_expiry).label
                    })), "warranties")}>
                      <FileDown className="h-3.5 w-3.5 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>

                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <SortableTableHeader column="name" label="Asset" sortConfig={warrantySort} onSort={handleWarrantySort} />
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground">Make / Model</TableHead>
                      <SortableTableHeader column="category" label="Category" sortConfig={warrantySort} onSort={handleWarrantySort} />
                      <SortableTableHeader column="warranty_expiry" label="Expiry Date" sortConfig={warrantySort} onSort={handleWarrantySort} />
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
                      <SortableTableHeader column="days" label="Days" sortConfig={warrantySort} onSort={handleWarrantySort} />
                      <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingWarranties ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`skel-warranty-${i}`}>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-14 rounded" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedWarranties.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center">
                            <Shield className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                            <p className="text-sm text-muted-foreground">No warranty records found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedWarranties.map((asset) => {
                        const warrantyInfo = getWarrantyStatus(asset.warranty_expiry);
                        const rowClass = warrantyInfo.status === "expired"
                          ? "bg-destructive/5 hover:bg-destructive/10 dark:bg-destructive/10 dark:hover:bg-destructive/15"
                          : warrantyInfo.status === "expiring"
                          ? "bg-amber-100/30 hover:bg-amber-100/50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
                          : "";
                        return (
                          <TableRow key={asset.id} className={`${rowClass} cursor-pointer transition-colors`} onClick={() => navigate(`/assets/detail/${asset.asset_tag || asset.id}`)}>
                            <TableCell className="font-medium">
                              <div>
                                <p className="text-xs">{asset.name}</p>
                                <p className="text-[11px] text-muted-foreground">{asset.asset_tag}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {(asset as any).make?.name || "—"}
                              {asset.model ? ` • ${asset.model}` : ""}
                            </TableCell>
                            <TableCell className="text-xs">{(asset as any).category?.name || '—'}</TableCell>
                            <TableCell className="text-xs">{format(new Date(asset.warranty_expiry), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <StatusDot status={warrantyInfo.status as any} label={warrantyInfo.label} />
                            </TableCell>
                            <TableCell className="text-xs">
                              {warrantyInfo.status === "expired" ? `${warrantyInfo.days} days ago` : `${warrantyInfo.days} days left`}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-7" onClick={() => navigate(`/assets/detail/${asset.asset_tag || asset.id}`)}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <PaginationControls currentPage={warrantyPage} totalPages={warrantyTotalPages} totalItems={filteredWarranties.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setWarrantyPage} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Depreciation Tab */}
          <TabsContent value="depreciation" className="mt-0 animate-in fade-in-0 duration-200">
            <DepreciationContent />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-0 space-y-2.5 animate-in fade-in-0 duration-200">
            <DocumentsStats />
            <InlinePhotoGallery />
            <InlineDocumentsList />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-0 animate-in fade-in-0 duration-200">
            <AssetReports />
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails" className="mt-0 animate-in fade-in-0 duration-200">
            <EmailsTab />
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup" className="mt-0 space-y-4 animate-in fade-in-0 duration-200">
            {renderSetupContent()}
          </TabsContent>
        </div>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? `Add ${dialogType}` : `Edit ${dialogType}`}</DialogTitle>
            <DialogDescription>
              {dialogMode === "add" ? `Create a new ${dialogType} entry.` : `Update the ${dialogType} details.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={`Enter ${dialogType} name`} />
            </div>
            {dialogType === "location" && (
              <div className="space-y-2">
                <Label htmlFor="site">Site (optional)</Label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!inputValue.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Deactivate ${itemToDelete?.type}`}
        description={`Are you sure you want to deactivate "${itemToDelete?.name}"? It will be hidden from all dropdowns and lists but can be reactivated later.`}
        confirmText={deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
        variant="destructive"
        onConfirm={() => { if (itemToDelete) deleteMutation.mutate({ type: itemToDelete.type, id: itemToDelete.id }); }}
      />

    </div>
  );
}
