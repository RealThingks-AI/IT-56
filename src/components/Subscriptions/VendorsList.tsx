import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreVertical, Edit, Trash2, Building2, Mail, Phone, Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AddVendorDialog } from "./AddVendorDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const VendorsList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Single-company mode: RLS handles access
  const { data: vendors, isLoading, refetch } = useQuery({
    queryKey: ["subscriptions-vendors", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("subscriptions_vendors")
        .select("*, subscriptions_tools(count)");

      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const vendorsChannel = supabase
      .channel('vendors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions_vendors',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["subscriptions-vendors"] });
        }
      )
      .subscribe();

    const toolsChannel = supabase
      .channel('vendors-tools-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions_tools',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["subscriptions-vendors"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(vendorsChannel);
      supabase.removeChannel(toolsChannel);
    };
  }, [queryClient]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("subscriptions_vendors")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
      refetch();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
        
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 h-8 ml-auto">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-sm">Add Vendor</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading vendors...</p>
          </div>
        </div>
      ) : !vendors || vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
          <div className="rounded-full bg-muted p-4 mb-3">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No vendors found</h3>
          <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
            Get started by adding your first vendor
          </p>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-sm">Add Vendor</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium h-9">VENDOR NAME</TableHead>
                <TableHead className="text-xs font-medium h-9">TOOLS</TableHead>
                <TableHead className="text-xs font-medium h-9">CONTACT</TableHead>
                <TableHead className="text-xs font-medium h-9">PHONE</TableHead>
                <TableHead className="text-xs font-medium h-9">WEBSITE</TableHead>
                <TableHead className="text-xs font-medium h-9">NOTES</TableHead>
                <TableHead className="text-xs font-medium h-9 text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-sm py-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {vendor.name}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="secondary" className="text-xs">
                      {(vendor.subscriptions_tools as any)?.[0]?.count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm py-2">
                    {vendor.contact_email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{vendor.contact_email}</span>
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
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <a 
                          href={vendor.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:underline truncate max-w-[150px] text-primary"
                        >
                          {vendor.website}
                        </a>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">
                    {vendor.notes ? (
                      <span className="line-clamp-1 max-w-[200px]">{vendor.notes}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(vendor.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddVendorDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onSuccess={refetch} />
    </div>
  );
};
