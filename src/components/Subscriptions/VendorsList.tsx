import { useState, useCallback } from "react";
import { sanitizeSearchInput } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreVertical, Edit, Trash2, Building2, Mail, Phone, Globe, User, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { AddVendorDialog } from "./AddVendorDialog";
import { formatCostShort } from "@/lib/subscriptions/subscriptionUtils";
import { convertToINR } from "@/lib/subscriptions/currencyConversion";
import { SortableTableHeader } from "@/components/helpdesk/SortableTableHeader";
import { useSortableAssets } from "@/hooks/assets/useSortableAssets";

const PAGE_SIZE = 25;

export const VendorsList = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data: vendors, isLoading, refetch } = useQuery({
    queryKey: ["subscriptions-vendors", searchTerm],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase
        .from("subscriptions_vendors")
        .select("*, subscriptions_tools(id, total_cost, currency)");

      if (searchTerm) {
        query = query.ilike("name", `%${sanitizeSearchInput(searchTerm)}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("subscriptions_vendors").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete vendor", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Vendor deleted" });
      refetch();
    }
    setDeleteId(null);
  };

  // Convert all tool costs to INR for consistent aggregation
  const getVendorSpendINR = (vendor: any): number => {
    const tools = vendor.subscriptions_tools as any[];
    if (!tools || tools.length === 0) return 0;
    return tools.reduce((sum: number, t: any) => {
      return sum + convertToINR(Number(t.total_cost || 0), t.currency || "INR");
    }, 0);
  };

  const getColumnValue = useCallback((item: any, column: string): string | number => {
    switch (column) {
      case "name": return item.name || "";
      case "contact": return item.contact_name || "";
      case "subs": return (item.subscriptions_tools as any[])?.length || 0;
      case "spend": return getVendorSpendINR(item);
      case "email": return item.contact_email || "";
      case "phone": return item.contact_phone || "";
      case "website": return item.website || "";
      default: return "";
    }
  }, []);

  const { sortedData, sortConfig, handleSort } = useSortableAssets(
    vendors || [],
    getColumnValue,
    { initialColumn: "name", initialDirection: null }
  );

  const totalPages = sortedData.length ? Math.ceil(sortedData.length / PAGE_SIZE) : 0;
  const paginatedVendors = sortedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="h-full flex flex-col gap-2 p-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} className="pl-9 h-8" />
        </div>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 h-8 ml-auto">
          <Plus className="h-3.5 w-3.5" /> Add Vendor
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableTableHeader column="" label="#" sortConfig={{ column: "", direction: null }} onSort={() => {}} className="w-[40px]" />
              <SortableTableHeader column="name" label="Vendor" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="contact" label="Contact" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="subs" label="Subs" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="spend" label="Total Spend ~INR" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
              <SortableTableHeader column="email" label="Email" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="phone" label="Phone" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="website" label="Website" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTableHeader column="" label="" sortConfig={{ column: "", direction: null }} onSort={() => {}} className="text-right w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j} className="py-2"><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No vendors found</p>
                  <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 h-8 mt-3">
                    <Plus className="h-3.5 w-3.5" /> Add Vendor
                  </Button>
                </TableCell>
              </TableRow>
            ) : paginatedVendors.map((vendor, index) => {
              const toolsArr = vendor.subscriptions_tools as any[];
              const toolCount = toolsArr?.length || 0;
              const spendINR = getVendorSpendINR(vendor);
              return (
                <TableRow key={vendor.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="text-xs text-muted-foreground py-2">{page * PAGE_SIZE + index + 1}</TableCell>
                  <TableCell className="font-medium text-sm py-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {vendor.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm py-2">
                    {vendor.contact_name ? (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {vendor.contact_name}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="secondary" className="text-xs">{toolCount}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-right py-2">
                    {spendINR > 0 ? formatCostShort(spendINR, "INR") : "—"}
                  </TableCell>
                  <TableCell className="text-sm py-2">
                    {vendor.contact_email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[160px]">{vendor.contact_email}</span>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm py-2">
                    {vendor.contact_phone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {vendor.contact_phone}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm py-2">
                    {vendor.website ? (
                      <a
                        href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[100px] text-xs">Visit</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingVendor(vendor); setIsAddDialogOpen(true); }}>
                          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(vendor.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page + 1} of {totalPages} ({sortedData.length} total)</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AddVendorDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setEditingVendor(null); }}
        onSuccess={() => { refetch(); setEditingVendor(null); setIsAddDialogOpen(false); }}
        editingVendor={editingVendor}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Delete Vendor?"
        description="This will permanently remove this vendor. Subscriptions linked to this vendor will not be deleted."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};
