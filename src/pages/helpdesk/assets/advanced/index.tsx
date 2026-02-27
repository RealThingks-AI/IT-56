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
  ChevronLeft, ChevronRight, Tag, Loader2, MoreHorizontal, UserX, PackageX,
  Send, Eye, ScrollText, Key, TrendingDown, FileDown, Image, FileText, X
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SortableTableHeader, SortConfig } from "@/components/helpdesk/SortableTableHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { EmailsTab } from "@/components/helpdesk/assets/setup/EmailsTab";
import { EmployeeAssetsDialog } from "@/components/helpdesk/assets/EmployeeAssetsDialog";
import { useUsers, AppUser } from "@/hooks/useUsers";
import AssetReports from "@/pages/helpdesk/assets/reports";
import AssetLogsPage from "@/pages/helpdesk/assets/AssetLogsPage";

import LicensesIndex from "@/pages/helpdesk/assets/licenses/index";
import DepreciationDashboard from "@/pages/helpdesk/assets/depreciation/index";
import ImportExportPage from "@/pages/helpdesk/assets/import-export";

// ─── Inline Documents Components ───────────────────────────────────────────────
// Photo gallery rendered inline (not as a dialog trigger card)
const InlinePhotoGallery = () => {
  const queryClient = useQueryClient();
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<any>(null);

  const { data: assetPhotos, isLoading } = useQuery({
    queryKey: ["asset-photos-storage"],
    queryFn: async () => {
      const { data: assets } = await supabase
        .from("itam_assets")
        .select("custom_fields")
        .eq("is_active", true)
        .not("custom_fields->>photo_url", "is", null)
        .limit(1000);
      const seenUrls = new Set<string>();
      const dbPhotos: { id: string; name: string; path: string; photo_url: string; created_at: string | null }[] = [];
      if (assets) {
        for (const asset of assets) {
          const photoUrl = (asset.custom_fields as Record<string, unknown>)?.photo_url as string | undefined;
          if (!photoUrl || seenUrls.has(photoUrl)) continue;
          if (!photoUrl.includes("supabase") && !photoUrl.includes("storage")) continue;
          seenUrls.add(photoUrl);
          const parts = photoUrl.split("/");
          const name = parts[parts.length - 1] || "unknown";
          const bucketIdx = photoUrl.indexOf("/asset-photos/");
          const path = bucketIdx >= 0 ? photoUrl.substring(bucketIdx + "/asset-photos/".length) : `migrated/${name}`;
          dbPhotos.push({ id: photoUrl, name: decodeURIComponent(name), path, photo_url: photoUrl, created_at: null });
        }
      }
      return dbPhotos;
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photo: any) => {
      const { error: storageError } = await supabase.storage.from("asset-photos").remove([photo.path]);
      if (storageError) throw storageError;
      const { data: affectedAssets } = await supabase.from("itam_assets").select("id, custom_fields").eq("is_active", true).not("custom_fields->>photo_url", "is", null);
      if (affectedAssets) {
        for (const asset of affectedAssets) {
          const cf = asset.custom_fields as Record<string, unknown> | null;
          if (cf?.photo_url === photo.photo_url) {
            const updatedCf = { ...cf } as Record<string, unknown>;
            delete updatedCf.photo_url;
            await supabase.from("itam_assets").update({ custom_fields: updatedCf as any }).eq("id", asset.id);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Photo deleted");
      queryClient.invalidateQueries({ queryKey: ["asset-photos-storage"] });
    },
    onError: () => toast.error("Failed to delete photo"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Photos</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Photos</span>
          <span className="text-xs text-muted-foreground">({assetPhotos?.length || 0})</span>
        </div>
        {(!assetPhotos || assetPhotos.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos linked to any assets yet.</p>
            <p className="text-xs mt-1">Add photos from the asset detail view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {assetPhotos.map((photo) => (
              <div key={photo.photo_url} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={photo.photo_url} alt={photo.name} className="w-full h-full object-cover hover:scale-105 transition-transform" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'; }} />
                </div>
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeletePhotoConfirm(photo)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
                <p className="text-[10px] mt-1 truncate text-muted-foreground" title={photo.name}>{photo.name}</p>
              </div>
            ))}
          </div>
        )}
        {/* Photo delete confirm dialog */}
        <ConfirmDialog
          open={!!deletePhotoConfirm}
          onOpenChange={(open) => { if (!open) setDeletePhotoConfirm(null); }}
          onConfirm={() => { if (deletePhotoConfirm) deletePhotoMutation.mutate(deletePhotoConfirm); setDeletePhotoConfirm(null); }}
          title="Delete Photo"
          description="Delete this photo? This cannot be undone."
          confirmText="Delete"
          variant="destructive"
        />
      </CardContent>
    </Card>
  );
};

// Documents list rendered inline
const InlineDocumentsList = () => {
  const queryClient = useQueryClient();
  const [deleteDocConfirm, setDeleteDocConfirm] = useState<any>(null);
  const { data: documents, isLoading } = useQuery({
    queryKey: ["asset-documents-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itam_asset_documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (doc: any) => {
      const urlParts = doc.file_path.split("/");
      const fileName = urlParts[urlParts.length - 1];
      await supabase.storage.from("asset-documents").remove([fileName]);
      const { error: dbError } = await supabase.from("itam_asset_documents").delete().eq("id", doc.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => { toast.success("Document deleted"); queryClient.invalidateQueries({ queryKey: ["asset-documents-all"] }); },
    onError: () => toast.error("Failed to delete document"),
  });

  const getDocIcon = (mimeType: string | null) => {
    if (!mimeType) return FileText;
    if (mimeType.includes("image")) return Image;
    return FileText;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Documents</span>
          </div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Documents</span>
          <span className="text-xs text-muted-foreground">({documents?.length || 0})</span>
          <p className="ml-auto text-[10px] text-muted-foreground">Add documents from the asset detail Docs tab</p>
        </div>
        {(!documents || documents.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents available.</p>
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {documents.map((doc: any) => {
              const DocIcon = getDocIcon(doc.mime_type);
              return (
                <div key={doc.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <DocIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(doc.file_size)} • {doc.created_at ? format(new Date(doc.created_at), "MMM dd, yyyy") : "—"}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.file_path, "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                   <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDocConfirm(doc)}>
                     <Trash2 className="h-3.5 w-3.5" />
                   </Button>
                </div>
              );
            })}
          </div>
        )}
        <ConfirmDialog
          open={!!deleteDocConfirm}
          onOpenChange={(open) => { if (!open) setDeleteDocConfirm(null); }}
          onConfirm={() => { if (deleteDocConfirm) deleteDocMutation.mutate(deleteDocConfirm); setDeleteDocConfirm(null); }}
          title="Delete Document"
          description="Delete this document? This cannot be undone."
          confirmText="Delete"
          variant="destructive"
        />
      </CardContent>
    </Card>
  );
};

// Documents stats with loading skeleton
const DocumentsStats = () => {
  const { data: docCount = 0, isLoading: loadingDocs } = useQuery({
    queryKey: ["itam-docs-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("itam_asset_documents").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: photoCount = 0, isLoading: loadingPhotos } = useQuery({
    queryKey: ["itam-photos-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("itam_assets")
        .select("*", { count: "exact", head: true })
        .not("custom_fields->>photo_url", "is", null)
        .neq("custom_fields->>photo_url", "");
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: assetsWithMedia = 0, isLoading: loadingMedia } = useQuery({
    queryKey: ["itam-assets-with-media"],
    queryFn: async () => {
      const { data: docAssets } = await supabase.from("itam_asset_documents").select("asset_id");
      const docSet = new Set((docAssets || []).map(d => d.asset_id).filter(id => id && id !== "00000000-0000-0000-0000-000000000000"));
      const { data: photoAssets } = await supabase
        .from("itam_assets")
        .select("id")
        .not("custom_fields->>photo_url", "is", null)
        .neq("custom_fields->>photo_url", "");
      (photoAssets || []).forEach(a => docSet.add(a.id));
      return docSet.size;
    },
  });

  const isLoading = loadingDocs || loadingPhotos || loadingMedia;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[68px] rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <StatCard icon={Image} value={photoCount} label="Total Photos" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
      <StatCard icon={FileText} value={docCount} label="Total Documents" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
      <StatCard icon={Package} value={assetsWithMedia} label="Assets with Media" colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
    </div>
  );
};

// Wrapper components to embed existing pages without their own headers/padding
const LicensesContent = () => <LicensesIndex embedded />;
const DepreciationContent = () => <DepreciationDashboard embedded />;
const ImportExportContent = () => <ImportExportPage embedded />;


// Tab configuration for Setup sub-navigation
const SETUP_TABS = [
  { id: "sites", label: "Sites & Locations" },
  { id: "categories", label: "Categories" },
  { id: "departments", label: "Departments" },
  { id: "makes", label: "Makes" },
  { id: "emails", label: "Emails" },
  { id: "vendors", label: "Vendors" },
] as const;

type SetupTabId = typeof SETUP_TABS[number]["id"];

const ITEMS_PER_PAGE = 50;

// Reusable stat card component — compact, no hover shadow per design philosophy
// Re-export shared StatCard for backward compatibility
import { StatCard } from "@/components/helpdesk/assets/StatCard";
export { StatCard };

// Deterministic avatar color based on name hash
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Status dot indicator
const StatusDot = ({ status, label }: { status: "active" | "inactive" | "pending" | "in_progress" | "completed" | "cancelled" | "expired" | "expiring"; label: string }) => {
  const dotColor = {
    active: "bg-green-500",
    inactive: "bg-red-500",
    pending: "bg-yellow-500",
    in_progress: "bg-blue-500",
    completed: "bg-green-500",
    cancelled: "bg-red-500",
    expired: "bg-red-500",
    expiring: "bg-yellow-500",
  }[status] || "bg-muted-foreground";

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};

// Pagination component
const PaginationControls = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: { currentPage: number; totalPages: number; totalItems: number; itemsPerPage: number; onPageChange: (page: number) => void }) => {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  return (
    <div className="flex items-center justify-between pt-3 px-1">
      <p className="text-xs text-muted-foreground">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

// CSV export utility
const exportCSV = (rows: Record<string, string | number>[], filename: string) => {
  if (rows.length === 0) { toast.info("No data to export"); return; }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} records`);
};

const VALID_TABS = ["employees", "licenses", "repairs", "warranties", "depreciation", "documents", "import-export", "reports", "logs", "setup"] as const;

export default function AdvancedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ─── URL-synced tab state (Phase 1: B4, B5, Phase 3: F20) ─────────────────
  const urlTab = searchParams.get("tab");
  const urlSection = searchParams.get("section");
  const activeTab = urlTab && (VALID_TABS as readonly string[]).includes(urlTab) ? urlTab : "employees";
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
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("all");
  const [warrantySearch, setWarrantySearch] = useState("");
  const [warrantyStatusFilter, setWarrantyStatusFilter] = useState("all");

  // Sorting state
  const [employeeSort, setEmployeeSort] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [vendorSort, setVendorSort] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [repairSort, setRepairSort] = useState<SortConfig>({ column: "created_at", direction: "desc" });
  const [warrantySort, setWarrantySort] = useState<SortConfig>({ column: "warranty_expiry", direction: "asc" });
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState("all");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("all");
  const [employeeAssetFilter, setEmployeeAssetFilter] = useState<"all" | "with_assets" | "no_assets">("all");

  // Pagination state
  const [employeePage, setEmployeePage] = useState(1);
  const [vendorPage, setVendorPage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [warrantyPage, setWarrantyPage] = useState(1);
  
  // Employee assets dialog
  const [selectedEmployee, setSelectedEmployee] = useState<AppUser | null>(null);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  
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
      const { data } = await supabase.from("itam_assets").select("category_id, department_id, location_id, make_id").eq("is_active", true);
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
  useEffect(() => { setEmployeePage(1); }, [employeeSearch, employeeAssetFilter, employeeStatusFilter, employeeRoleFilter]);
  useEffect(() => { setVendorPage(1); }, [vendorSearch]);
  useEffect(() => { setMaintenancePage(1); }, [maintenanceSearch, maintenanceStatusFilter]);
  useEffect(() => { setWarrantyPage(1); }, [warrantySearch, warrantyStatusFilter]);

  // Fetch ALL users (active + inactive) for the employees tab
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["app-users-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, auth_user_id, name, email, role, status")
        .order("name");
      if (error) { console.error("Failed to fetch users:", error); return []; }
      return (data || []) as AppUser[];
    },
    enabled: activeTab === "employees",
    staleTime: 2 * 60 * 1000,
  });

  // Fetch asset counts for employees
  const { data: assetCounts = {} } = useQuery({
    queryKey: ["employee-asset-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("assigned_to")
        .eq("is_active", true)
        .not("assigned_to", "is", null);
      
      const counts: Record<string, number> = {};
      data?.forEach((a) => {
        if (a.assigned_to) {
          counts[a.assigned_to] = (counts[a.assigned_to] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: activeTab === "employees",
    staleTime: 5 * 60 * 1000,
  });

  const getEmployeeAssetCount = (emp: AppUser) => {
    return (assetCounts[emp.id] || 0) + 
      (emp.auth_user_id && emp.auth_user_id !== emp.id 
        ? (assetCounts[emp.auth_user_id] || 0) 
        : 0);
  };

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
        .select("*, asset:itam_assets(id, name, asset_tag, asset_id)")
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

  // Filter & sort employees
  const filteredEmployees = employees
    .filter((emp) => {
      if (employeeStatusFilter !== "all" && emp.status !== employeeStatusFilter) return false;
      if (employeeRoleFilter !== "all" && (emp.role || "user") !== employeeRoleFilter) return false;
      if (employeeAssetFilter === "with_assets" && getEmployeeAssetCount(emp) === 0) return false;
      if (employeeAssetFilter === "no_assets" && getEmployeeAssetCount(emp) > 0) return false;
      if (employeeSearch) {
        return emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          emp.email?.toLowerCase().includes(employeeSearch.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      const { column, direction } = employeeSort;
      if (!direction) return 0;
      const mult = direction === "asc" ? 1 : -1;
      if (column === "assets") {
        return (getEmployeeAssetCount(a) - getEmployeeAssetCount(b)) * mult;
      }
      const valA = (column === "name" ? a.name : column === "email" ? a.email : column === "role" ? (a.role || "user") : a.status) || "";
      const valB = (column === "name" ? b.name : column === "email" ? b.email : column === "role" ? (b.role || "user") : b.status) || "";
      return valA.localeCompare(valB) * mult;
    });

  const handleEmployeeSort = (column: string) => {
    setEmployeeSort(prev => ({
      column,
      direction: prev.column === column ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  };

  // Filter & sort vendors
  const filteredVendors = vendors
    .filter((vendor) =>
      vendorSearch
        ? vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
          vendor.contact_email?.toLowerCase().includes(vendorSearch.toLowerCase())
        : true
    )
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
    const searchLower = maintenanceSearch.toLowerCase();
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
      const searchLower = warrantySearch.toLowerCase();
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
  const employeeTotalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice((employeePage - 1) * ITEMS_PER_PAGE, employeePage * ITEMS_PER_PAGE);

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
      const tableName = getTableName(dialogType);
      if (dialogMode === "add") {
        if (dialogType === "category") {
          const { data: existing } = await supabase
            .from("itam_categories")
            .select("id, name")
            .eq("is_active", true)
            .ilike("name", inputValue.trim());
          if (existing && existing.length > 0) {
            throw new Error(`A category named "${existing[0].name}" already exists`);
          }
        }
        const insertData: Record<string, unknown> = { name: inputValue.trim() };
        if (dialogType === "location" && selectedSiteId) insertData.site_id = selectedSiteId;
        const { error } = await supabase.from(tableName as any).insert(insertData);
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = { name: inputValue.trim() };
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

  const handleViewEmployeeAssets = (employee: AppUser) => {
    setSelectedEmployee(employee);
    setEmployeeDialogOpen(true);
  };

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
      <TableHeader className="bg-muted/50">
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
            <TableCell colSpan={type === "location" ? 5 : 4} className="text-center py-8 text-muted-foreground">
              No {type}s found. Click "Add {type}" to create one.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              {type === "location" && (
                <TableCell>
                  {item.site_id ? (sites.find(s => s.id === item.site_id)?.name || "-") : <span className="text-muted-foreground">-</span>}
                </TableCell>
              )}
              <TableCell className="text-sm text-muted-foreground">{getSetupItemAssetCount(type, item.id)}</TableCell>
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
            <div className="ml-auto">
              <Button size="sm" onClick={() => openAddDialog("category")}>
                <Plus className="h-3 w-3 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No categories found. Click "Add Category" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => {
                  const tf = getTagFormatForCategory(cat.id);
                  return (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>
                        {tf ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tf.prefix}</code> : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>{tf ? tf.zero_padding : "—"}</TableCell>
                      <TableCell>
                        {tf ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {tf.prefix}{getNextNumberForPrefix(tf.prefix).toString().padStart(tf.zero_padding, "0")}
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getSetupItemAssetCount("category", cat.id)}</TableCell>
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
              <Button size="sm" variant="outline" onClick={() => openAddDialog("location")}>
                <Plus className="h-3 w-3 mr-2" />
                Add Location
              </Button>
              <Button size="sm" onClick={() => openAddDialog("site")}>
                <Plus className="h-3 w-3 mr-2" />
                Add Site
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No sites or locations found. Add a site or location to get started.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={`${row.rowType}-${row.id}`}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{row.rowType}</span>
                    </TableCell>
                    <TableCell>
                      {row.rowType === "location" && row.parentSiteName ? (
                        row.parentSiteName
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getSetupItemAssetCount(row.rowType, row.id)}</TableCell>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="pl-9 pr-8 h-8" />
          {vendorSearch && (
            <button onClick={() => setVendorSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
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
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Loading vendors...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <Building2 className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No vendors found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedVendors.map((vendor) => (
                <TableRow key={vendor.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/assets/vendors/detail/${vendor.id}`)}>
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
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        <Globe className="h-3.5 w-3.5" />
                        Visit
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
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
    if (setupSubTab === "emails") return <EmailsTab />;
    if (setupSubTab === "vendors") return renderVendorsSetupContent();

    return (
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Manage {tabConfig?.label.toLowerCase()}</span>
            <div className="ml-auto">
              <Button size="sm" onClick={() => openAddDialog(type)}>
                <Plus className="h-3 w-3 mr-2" />
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
        <div className="sticky top-0 z-30 bg-background border-b px-4 py-2">
          <div className="relative">
            <TabsList className="h-9 bg-muted rounded-lg p-1 w-full justify-start gap-1 overflow-x-auto overflow-y-hidden scrollbar-none">
              <TabsTrigger value="employees" className="text-xs flex-shrink-0">Employees</TabsTrigger>
              <TabsTrigger value="licenses" className="text-xs flex-shrink-0">Licenses</TabsTrigger>
              <TabsTrigger value="repairs" className="text-xs flex-shrink-0">Repairs</TabsTrigger>
              <TabsTrigger value="warranties" className="text-xs flex-shrink-0">Warranties</TabsTrigger>
              <TabsTrigger value="depreciation" className="text-xs flex-shrink-0">Depreciation</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs flex-shrink-0">Documents</TabsTrigger>
              <TabsTrigger value="import-export" className="text-xs flex-shrink-0">Import/Export</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs flex-shrink-0">Reports</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs flex-shrink-0">Logs</TabsTrigger>
              <TabsTrigger value="setup" className="text-xs flex-shrink-0">Setup</TabsTrigger>
            </TabsList>
            {/* Fade gradient for scroll indicator */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent lg:hidden" />
          </div>
        </div>

        {/* Secondary Navigation for Setup Tab */}
        {activeTab === "setup" && (
          <div className="border-b px-4 py-2 flex flex-wrap gap-1.5 bg-background">
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
                  className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
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
        <div className="flex-1 overflow-auto p-4">
          {/* Employees Tab */}
          <TabsContent value="employees" className="mt-0 space-y-4 animate-in fade-in-0 duration-200">
            {/* Stat Cards — with loading skeletons */}
            {loadingEmployees ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[68px] rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <StatCard icon={Users} value={employees.length} label="Total Employees" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" onClick={() => { setEmployeeStatusFilter("all"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("all"); }} active={employeeStatusFilter === "all" && employeeRoleFilter === "all" && employeeAssetFilter === "all"} />
                <StatCard icon={CheckCircle} value={employees.filter(e => e.status === "active").length} label="Active" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" onClick={() => { setEmployeeStatusFilter("active"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("all"); }} active={employeeStatusFilter === "active" && employeeRoleFilter === "all" && employeeAssetFilter === "all"} />
                <StatCard icon={UserX} value={employees.filter(e => e.status !== "active").length} label="Inactive" colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" onClick={() => { setEmployeeStatusFilter("inactive"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("all"); }} active={employeeStatusFilter === "inactive" && employeeRoleFilter === "all" && employeeAssetFilter === "all"} />
                <StatCard icon={Package} value={Object.values(assetCounts).reduce((sum, c) => sum + c, 0)} label="Assets Assigned" colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" onClick={() => { setEmployeeStatusFilter("all"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("with_assets"); }} active={employeeAssetFilter === "with_assets" && employeeStatusFilter === "all" && employeeRoleFilter === "all"} />
                <StatCard icon={PackageX} value={employees.filter(e => getEmployeeAssetCount(e) === 0).length} label="No Assets" colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" onClick={() => { setEmployeeStatusFilter("all"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("no_assets"); }} active={employeeAssetFilter === "no_assets" && employeeStatusFilter === "all" && employeeRoleFilter === "all"} />
              </div>
            )}

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative max-w-sm flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search employees..." value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} className="pl-9 pr-8 h-8" />
                    {employeeSearch && (
                      <button onClick={() => setEmployeeSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                   <Badge variant="secondary" className="text-xs tabular-nums">{filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}</Badge>
                  <Select value={employeeRoleFilter} onValueChange={setEmployeeRoleFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportCSV(filteredEmployees.map(e => ({
                      Name: e.name || "",
                      Email: e.email || "",
                      Role: e.role || "user",
                      Status: e.status || "",
                      "Assets Assigned": getEmployeeAssetCount(e),
                    })), "employees")}>
                      <FileDown className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => window.open("/admin/users", "_blank")}>
                      <Users className="h-4 w-4 mr-1.5" />
                      Manage Users
                    </Button>
                    {(employeeRoleFilter !== "all" || employeeStatusFilter !== "all" || employeeAssetFilter !== "all" || employeeSearch) && (
                      <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => { setEmployeeRoleFilter("all"); setEmployeeStatusFilter("all"); setEmployeeAssetFilter("all"); setEmployeeSearch(""); }}>
                        <X className="h-3.5 w-3.5 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <SortableTableHeader column="name" label="Name" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                        <SortableTableHeader column="email" label="Email" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                        <SortableTableHeader column="role" label="Role" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                        <SortableTableHeader column="status" label="Status" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                        <SortableTableHeader column="assets" label="Assets" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingEmployees ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
                              <p className="text-sm text-muted-foreground">Loading employees...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginatedEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                       <Users className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                              <p className="text-sm text-muted-foreground">No employees found</p>
                              {(employeeRoleFilter !== "all" || employeeStatusFilter !== "all" || employeeAssetFilter !== "all" || employeeSearch) && (
                                <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => { setEmployeeRoleFilter("all"); setEmployeeStatusFilter("all"); setEmployeeAssetFilter("all"); setEmployeeSearch(""); }}>
                                  Clear filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedEmployees.map((employee) => {
                          const assetCount = getEmployeeAssetCount(employee);
                          const initials = employee.name
                            ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : employee.email[0].toUpperCase();
                          return (
                            <TableRow
                              key={employee.id}
                              className="h-11 hover:bg-muted/50 cursor-pointer transition-colors group"
                              tabIndex={0}
                              onClick={() => handleViewEmployeeAssets(employee)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleViewEmployeeAssets(employee); }}
                              title="Click to view assigned assets"
                            >
                              <TableCell className="font-medium py-2">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className={`text-xs font-medium ${getAvatarColor(employee.name || employee.email)}`}>{initials}</AvatarFallback>
                                  </Avatar>
                                  <span className="truncate max-w-[180px]">{employee.name || "—"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate py-2" title={employee.email}>{employee.email || "—"}</TableCell>
                              <TableCell className="text-sm capitalize py-2">{employee.role || "user"}</TableCell>
                              <TableCell className="py-2">
                                <StatusDot
                                  status={employee.status === "active" ? "active" : employee.status === "suspended" ? "pending" : "inactive"}
                                  label={employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : "Unknown"}
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-1.5">
                                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium tabular-nums">{assetCount}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewEmployeeAssets(employee); }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Assets
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/assets/checkout?user=${employee.id}`); }}>
                                      <Package className="h-4 w-4 mr-2" />
                                      Assign Asset
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/users?edit=${employee.id}`); }}>
                                      <Users className="h-4 w-4 mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`mailto:${employee.email}`, '_blank'); }}>
                                      <Send className="h-4 w-4 mr-2" />
                                      Email User
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
                
                <PaginationControls
                  currentPage={employeePage}
                  totalPages={employeeTotalPages}
                  totalItems={filteredEmployees.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setEmployeePage}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-0 animate-in fade-in-0 duration-200">
            <AssetLogsPage />
          </TabsContent>

          {/* Licenses Tab */}
          <TabsContent value="licenses" className="mt-0 animate-in fade-in-0 duration-200">
            <LicensesContent />
          </TabsContent>

          {/* Repairs Tab — with sortable headers (Phase 3: F4) */}
          <TabsContent value="repairs" className="mt-0 space-y-4 animate-in fade-in-0 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={Wrench} value={maintenancePending} label="Pending" colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
              <StatCard icon={Wrench} value={maintenanceInProgress} label="In Progress" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
              <StatCard icon={CheckCircle} value={maintenanceCompleted} label="Completed" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
            </div>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 max-w-sm min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search repairs..." value={maintenanceSearch} onChange={(e) => setMaintenanceSearch(e.target.value)} className="pl-9 pr-8 h-8" />
                    {maintenanceSearch && (
                      <button onClick={() => setMaintenanceSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Select value={maintenanceStatusFilter} onValueChange={setMaintenanceStatusFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportCSV(filteredMaintenances.map(m => ({
                      "Repair #": m.repair_number || "",
                      Asset: m.asset?.name || "",
                      "Asset Tag": m.asset?.asset_tag || "",
                      Issue: m.issue_description || "",
                      Status: m.status || "",
                      Created: m.created_at ? format(new Date(m.created_at), "yyyy-MM-dd") : "",
                      "Days Open": m.status !== "completed" && m.status !== "cancelled" && m.created_at
                        ? differenceInDays(new Date(), new Date(m.created_at))
                        : "",
                    })), "repairs")}>
                      <FileDown className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    <Button size="sm" onClick={() => navigate("/assets/repairs/create")}>
                      <Plus className="h-4 w-4 mr-1" />
                      New Record
                    </Button>
                  </div>
                </div>

                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <SortableTableHeader column="repair_number" label="Repair #" sortConfig={repairSort} onSort={handleRepairSort} />
                        <SortableTableHeader column="asset" label="Asset" sortConfig={repairSort} onSort={handleRepairSort} />
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Issue</TableHead>
                        <SortableTableHeader column="status" label="Status" sortConfig={repairSort} onSort={handleRepairSort} />
                        <SortableTableHeader column="created_at" label="Created" sortConfig={repairSort} onSort={handleRepairSort} />
                        <SortableTableHeader column="days_open" label="Days Open" sortConfig={repairSort} onSort={handleRepairSort} />
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[80px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMaintenances ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
                              <p className="text-sm text-muted-foreground">Loading records...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginatedMaintenances.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
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
                            <TableCell className="font-medium">{maintenance.repair_number}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{maintenance.asset?.name || '-'}</p>
                                <p className="text-xs text-muted-foreground">{maintenance.asset?.asset_id || maintenance.asset?.asset_tag}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{maintenance.issue_description || '-'}</TableCell>
                            <TableCell>{getMaintenanceStatusDot(maintenance.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {maintenance.created_at ? format(new Date(maintenance.created_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {daysOpen !== null ? (
                                <span className={daysOpen > 14 ? "text-destructive font-medium" : daysOpen > 7 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                                  {daysOpen}d
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-7" onClick={(e) => { e.stopPropagation(); navigate(`/assets/repairs/detail/${maintenance.id}`); }}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
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

          {/* Warranties Tab — with sortable headers and dark mode row highlighting (Phase 1: B3, Phase 3: F4) */}
          <TabsContent value="warranties" className="mt-0 space-y-4 animate-in fade-in-0 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={CheckCircle} value={warrantyActive} label="Active" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
              <StatCard icon={Shield} value={warrantyExpiring} label="Expiring Soon" colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
              <StatCard icon={Shield} value={warrantyExpired} label="Expired" colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            </div>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 max-w-sm min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search warranties..." value={warrantySearch} onChange={(e) => setWarrantySearch(e.target.value)} className="pl-9 h-8" />
                  </div>
                  <Select value={warrantyStatusFilter} onValueChange={setWarrantyStatusFilter}>
                    <SelectTrigger className="w-[140px] h-8">
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
                    <Button size="sm" variant="outline" onClick={() => exportCSV(filteredWarranties.map(a => ({
                      Asset: a.name, Tag: a.asset_tag || "", Category: (a as any).category?.name || "",
                      Make: (a as any).make?.name || "", Model: a.model || "",
                      "Expiry Date": a.warranty_expiry ? format(new Date(a.warranty_expiry), "yyyy-MM-dd") : "",
                      Status: getWarrantyStatus(a.warranty_expiry).label
                    })), "warranties")}>
                      <FileDown className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>

                  <Table>
                    <TableHeader className="bg-muted/50">
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
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
                              <p className="text-sm text-muted-foreground">Loading warranty records...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginatedWarranties.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Shield className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                              <p className="text-sm text-muted-foreground">No warranty records found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedWarranties.map((asset) => {
                          const warrantyInfo = getWarrantyStatus(asset.warranty_expiry);
                          // Dark mode compatible row highlighting (Phase 1: B3)
                          const rowClass = warrantyInfo.status === "expired"
                            ? "bg-destructive/5 hover:bg-destructive/10 dark:bg-destructive/10 dark:hover:bg-destructive/15"
                            : warrantyInfo.status === "expiring"
                            ? "bg-amber-100/30 hover:bg-amber-100/50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
                            : "";
                          return (
                            <TableRow key={asset.id} className={`${rowClass} cursor-pointer transition-colors`} onClick={() => navigate(`/assets/detail/${asset.id}`)}>
                              <TableCell className="font-medium">
                                <div>
                                  <p className="text-sm">{asset.name}</p>
                                  <p className="text-xs text-muted-foreground">{asset.asset_tag}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {(asset as any).make?.name || "—"}
                                {asset.model ? ` • ${asset.model}` : ""}
                              </TableCell>
                              <TableCell>{(asset as any).category?.name || '—'}</TableCell>
                              <TableCell>{format(new Date(asset.warranty_expiry), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                <StatusDot status={warrantyInfo.status as any} label={warrantyInfo.label} />
                              </TableCell>
                              <TableCell className="text-sm">
                                {warrantyInfo.status === "expired" ? `${warrantyInfo.days} days ago` : `${warrantyInfo.days} days left`}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="h-7" onClick={() => navigate(`/assets/detail/${asset.id}`)}>
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

          {/* Documents Tab — inline content (Phase 2: B2) */}
          <TabsContent value="documents" className="mt-0 space-y-4 animate-in fade-in-0 duration-200">
            <DocumentsStats />
            <InlinePhotoGallery />
            <InlineDocumentsList />
          </TabsContent>

          {/* Import/Export Tab */}
          <TabsContent value="import-export" className="mt-0 animate-in fade-in-0 duration-200">
            <ImportExportContent />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-0 animate-in fade-in-0 duration-200">
            <AssetReports />
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {itemToDelete?.type}</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate "{itemToDelete?.name}"? It will be hidden from all dropdowns and lists but can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (itemToDelete) deleteMutation.mutate({ type: itemToDelete.type, id: itemToDelete.id }); }} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Assets Dialog */}
      <EmployeeAssetsDialog employee={selectedEmployee} open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen} />
    </div>
  );
}
