import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreVertical, Edit, Trash2, Package } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AddToolDialog } from "./AddToolDialog";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/currencyConversion";

export const ToolsList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<any | null>(null);

  const { data: tools, isLoading, refetch } = useQuery({
    queryKey: ["subscriptions-tools", searchTerm, statusFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("subscriptions_tools")
        .select("*, subscriptions_vendors(name)");

      if (searchTerm) {
        query = query.ilike("tool_name", `%${searchTerm}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription - simplified without org filter
  useEffect(() => {
    const channel = supabase
      .channel('tools-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions_tools',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["subscriptions-tools"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("subscriptions_tools").delete().eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete tool",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Tool deleted successfully"
      });
      refetch();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trial: "secondary",
      expired: "destructive",
      cancelled: "outline"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getDaysUntilRenewal = (renewalDate: string | null) => {
    if (!renewalDate) return null;
    const days = Math.ceil((new Date(renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tools..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="SaaS">SaaS</SelectItem>
              <SelectItem value="Desktop Software">Desktop</SelectItem>
              <SelectItem value="Cloud Service">Cloud</SelectItem>
              <SelectItem value="Security Tool">Security</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-sm">Add Tool</span>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium h-9">TOOL NAME</TableHead>
              <TableHead className="text-xs font-medium h-9">VENDOR</TableHead>
              <TableHead className="text-xs font-medium h-9">CATEGORY</TableHead>
              <TableHead className="text-xs font-medium h-9">COST</TableHead>
              <TableHead className="text-xs font-medium h-9">BILLING</TableHead>
              <TableHead className="text-xs font-medium h-9">RENEWAL</TableHead>
              <TableHead className="text-xs font-medium h-9">STATUS</TableHead>
              <TableHead className="text-xs font-medium h-9 text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Loading tools...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : !tools || tools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tools found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : tools.map(tool => {
              const daysUntilRenewal = getDaysUntilRenewal(tool.renewal_date);
              const isExpiringSoon = daysUntilRenewal !== null && daysUntilRenewal <= 7 && daysUntilRenewal > 0;
              return (
                <TableRow key={tool.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-sm py-2">{tool.tool_name}</TableCell>
                  <TableCell className="text-sm py-2">{tool.subscriptions_vendors?.name || "—"}</TableCell>
                  <TableCell className="py-2">
                    {tool.category ? (
                      <Badge variant="outline" className="text-xs">{tool.category}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium py-2">
                    {formatINR(Number(tool.total_cost || 0))}
                  </TableCell>
                  <TableCell className="text-xs capitalize py-2">
                    {tool.billing_cycle?.replace("_", " ") || "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    {tool.renewal_date ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tool.renewal_date), "MMM d, yyyy")}
                        </span>
                        {daysUntilRenewal !== null && (
                          <Badge 
                            variant={isExpiringSoon ? "destructive" : "secondary"} 
                            className="text-xs w-fit"
                          >
                            {daysUntilRenewal > 0 ? `${daysUntilRenewal}d` : "Expired"}
                          </Badge>
                        )}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="py-2">{getStatusBadge(tool.status)}</TableCell>
                  <TableCell className="text-right py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingTool(tool);
                          setIsAddDialogOpen(true);
                        }}>
                          <Edit className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tool.id)}>
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

      <AddToolDialog 
        open={isAddDialogOpen} 
        onOpenChange={open => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingTool(null);
          }
        }} 
        onSuccess={() => {
          refetch();
          setEditingTool(null);
        }} 
        editingTool={editingTool} 
      />
    </div>
  );
};
