import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreVertical, Edit, Trash2, Key } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AddLicenseDialog } from "./AddLicenseDialog";
import { useToast } from "@/hooks/use-toast";

export const LicensesList = () => {
  const { organisation } = useOrganisation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<any>(null);

  const { data: licenses, isLoading, refetch } = useQuery({
    queryKey: ["subscriptions-licenses", organisation?.id, searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("subscriptions_licenses")
        .select(`
          *,
          subscriptions_tools(tool_name)
        `)
        .eq("organisation_id", organisation?.id!);

      if (searchTerm) {
        query = query.ilike("license_key", `%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organisation?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!organisation?.id) return;

    const channel = supabase
      .channel('licenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions_licenses',
          filter: `organisation_id=eq.${organisation.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["subscriptions-licenses"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organisation?.id, queryClient]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("subscriptions_licenses")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete license",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "License deleted successfully",
      });
      refetch();
    }
  };

  const handleEdit = (license: any) => {
    setEditingLicense(license);
    setIsAddDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingLicense(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "secondary",
      assigned: "default",
      expired: "destructive",
      revoked: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading licenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search licenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-sm">Add License</span>
          </Button>
        </div>
      </div>

      {!licenses || licenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
          <div className="rounded-full bg-muted p-4 mb-3">
            <Key className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No licenses found</h3>
          <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
            Get started by adding your first license
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium h-9">TOOL</TableHead>
                <TableHead className="text-xs font-medium h-9">LICENSE KEY</TableHead>
                <TableHead className="text-xs font-medium h-9">STATUS</TableHead>
                <TableHead className="text-xs font-medium h-9">ASSIGNED TO</TableHead>
                <TableHead className="text-xs font-medium h-9">ASSIGNED DATE</TableHead>
                <TableHead className="text-xs font-medium h-9">EXPIRY DATE</TableHead>
                <TableHead className="text-xs font-medium h-9 text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((license) => {
                const daysUntilExpiry = getDaysUntilExpiry(license.expires_at);
                return (
                  <TableRow key={license.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-sm py-2">
                      {license.subscriptions_tools?.tool_name || "N/A"}
                    </TableCell>
                    <TableCell className="font-mono text-xs py-2">
                      {license.license_key || "—"}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(license.status || "available")}
                        {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                          <Badge 
                            variant={daysUntilExpiry <= 7 ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {daysUntilExpiry > 0 ? `${daysUntilExpiry}d` : "Expired"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm py-2">
                      {license.assigned_to_name || license.assigned_to_email || license.assigned_to || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">
                      {license.assigned_at
                        ? format(new Date(license.assigned_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">
                      {license.expires_at
                        ? format(new Date(license.expires_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(license)}>
                            <Edit className="h-3.5 w-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(license.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
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
      )}

      <AddLicenseDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={() => {
          refetch();
          handleDialogClose();
        }}
        editingLicense={editingLicense}
      />
    </div>
  );
};