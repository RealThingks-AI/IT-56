import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, GitMerge } from "lucide-react";
import { toast } from "sonner";
import { TicketModuleTopBar } from "@/components/helpdesk/tickets/TicketModuleTopBar";
import { TicketTableView } from "@/components/helpdesk/TicketTableView";
import { TicketPagination } from "@/components/helpdesk/TicketPagination";
import { BulkActionsButton } from "@/components/helpdesk/BulkActionsButton";
import { MergeTicketsDialog } from "@/components/helpdesk/MergeTicketsDialog";
import { EditTicketDialog } from "@/components/helpdesk/EditTicketDialog";
import { AssignTicketDialog } from "@/components/helpdesk/AssignTicketDialog";
import { CreateTicketDialog } from "@/components/helpdesk/CreateTicketDialog";
import { useUnifiedRequests } from "@/hooks/useUnifiedRequests";
import { isSLABreached } from "@/lib/ticketUtils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";

export default function TicketsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // URL-based initial filters
  const initialFilters: Record<string, any> = {};
  if (searchParams.get("status")) initialFilters.status = searchParams.get("status");
  if (searchParams.get("priority")) initialFilters.priority = searchParams.get("priority");
  if (searchParams.get("requestType")) initialFilters.requestType = searchParams.get("requestType");
  if (searchParams.get("search")) initialFilters.search = searchParams.get("search");
  if (searchParams.get("assignee")) initialFilters.assignee = searchParams.get("assignee");
  if (searchParams.get("sla")) initialFilters.sla = searchParams.get("sla");

  // State
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<any>(null);
  const [assignTicket, setAssignTicket] = useState<any>(null);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Data fetching
  const { data: allRequests, isLoading } = useUnifiedRequests('all');

  // Client-side filtering
  const requests = (allRequests || []).filter((request: any) => {
    if (filters.requestType && request.request_type !== filters.requestType) return false;
    if (filters.status && request.status !== filters.status) return false;
    if (filters.priority && request.priority !== filters.priority) return false;
    if (filters.category && request.category_id?.toString() !== filters.category) return false;
    if (filters.assignee === 'unassigned' && request.assignee_id) return false;
    if (filters.assignee && filters.assignee !== 'unassigned' && request.assignee_id !== filters.assignee) return false;
    // SLA filter
    if (filters.sla === 'breached') {
      const isBreached = isSLABreached(request);
      if (!isBreached) return false;
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesSearch = request.title?.toLowerCase().includes(search) || 
        request.description?.toLowerCase().includes(search) || 
        request.ticket_number?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    if (filters.dateFrom && new Date(request.created_at) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(request.created_at) > new Date(filters.dateTo)) return false;
    return true;
  });

  // Quick status change mutation
  const quickStatusChange = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: number; status: string }) => {
      const { error } = await supabase
        .from("helpdesk_tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-requests"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-dashboard-stats"] });
      toast.success("Ticket status updated");
    },
    onError: () => {
      toast.error("Failed to update ticket status");
    },
  });

  const handleQuickStatusChange = (ticketId: number, status: string) => {
    quickStatusChange.mutate({ ticketId, status });
  };

  const handleSelectTicket = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked: boolean) => {
    const pageTickets = requests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    setSelectedIds(checked ? pageTickets.map((t: any) => t.id) : []);
  };

  // Paginated data
  const paginatedRequests = requests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="h-full flex flex-col bg-background">
      <TicketModuleTopBar 
        exportData={requests}
        exportFilename="tickets-export"
      >
        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-1">
          {/* Type Toggle */}
          <ToggleGroup 
            type="single" 
            value={filters.requestType || 'all'} 
            onValueChange={(value) => {
              if (value) setFilters({ ...filters, requestType: value === 'all' ? null : value });
            }}
            className="h-7"
          >
            <ToggleGroupItem value="all" className="h-7 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="ticket" className="h-7 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Tickets
            </ToggleGroupItem>
            <ToggleGroupItem value="service_request" className="h-7 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Requests
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="relative w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={filters.search || ''} 
              onChange={e => setFilters({ ...filters, search: e.target.value })} 
              className="pl-8 h-7 text-xs" 
            />
          </div>

          <Select 
            value={filters.status || 'all'} 
            onValueChange={value => setFilters({ ...filters, status: value === 'all' ? null : value })}
          >
            <SelectTrigger className="w-[90px] h-7 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.priority || 'all'} 
            onValueChange={value => setFilters({ ...filters, priority: value === 'all' ? null : value })}
          >
            <SelectTrigger className="w-[90px] h-7 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          <BulkActionsButton 
            selectedIds={selectedIds} 
            onClearSelection={() => setSelectedIds([])} 
          />
          
          {selectedIds.length >= 2 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 gap-1 text-xs"
              onClick={() => setMergeDialogOpen(true)}
            >
              <GitMerge className="h-3 w-3" />
              Merge ({selectedIds.length})
            </Button>
          )}
        </div>
      </TicketModuleTopBar>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <TicketTableView
            tickets={paginatedRequests}
            selectedIds={selectedIds}
            onSelectTicket={handleSelectTicket}
            onSelectAll={handleSelectAll}
            onEditTicket={setEditTicket}
            onAssignTicket={setAssignTicket}
            onQuickStatusChange={handleQuickStatusChange}
          />
        )}
      </div>

      {/* Pagination */}
      <TicketPagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={requests.length}
        totalPages={Math.ceil(requests.length / pageSize)}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        className="border-t-0"
      />

      {/* Dialogs */}
      <CreateTicketDialog 
        open={createTicketOpen} 
        onOpenChange={setCreateTicketOpen} 
      />
      
      {editTicket && (
        <EditTicketDialog
          ticket={editTicket}
          open={!!editTicket}
          onOpenChange={(open) => !open && setEditTicket(null)}
        />
      )}
      
      {assignTicket && (
        <AssignTicketDialog
          ticket={assignTicket}
          open={!!assignTicket}
          onOpenChange={(open) => !open && setAssignTicket(null)}
        />
      )}

      <MergeTicketsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        sourceTicketIds={selectedIds}
        onSuccess={() => {
          setSelectedIds([]);
          queryClient.invalidateQueries({ queryKey: ["unified-requests"] });
        }}
      />
    </div>
  );
}
