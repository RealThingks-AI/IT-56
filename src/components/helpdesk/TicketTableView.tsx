import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, AlertTriangle, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getUserDisplayName } from "@/lib/userUtils";
import { isSLABreached, formatStatus } from "@/lib/tickets/ticketUtils";
import { FormattedDate } from "@/components/FormattedDate";
import { SortableTableHeader, type SortConfig } from "@/components/helpdesk/SortableTableHeader";

interface TicketTableViewProps {
  tickets: any[];
  selectedIds: number[];
  onSelectTicket: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
  onEditTicket?: (ticket: any) => void;
  onAssignTicket?: (ticket: any) => void;
  onQuickStatusChange?: (ticketId: number, status: string) => void;
  sortConfig?: SortConfig;
  onSort?: (column: string) => void;
}

// Status dot color mapping
const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-blue-500';
    case 'in_progress': return 'bg-purple-500';
    case 'on_hold': return 'bg-yellow-500';
    case 'resolved': return 'bg-green-500';
    case 'closed': return 'bg-gray-400';
    case 'fulfilled': return 'bg-green-500';
    default: return 'bg-gray-400';
  }
};

// Priority text color
const getPriorityTextColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 dark:text-red-400 font-semibold';
    case 'high': return 'text-orange-600 dark:text-orange-400 font-medium';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400';
    case 'low': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
};

const defaultSortConfig: SortConfig = { column: "", direction: null };

export const TicketTableView = ({ 
  tickets, 
  selectedIds, 
  onSelectTicket, 
  onSelectAll,
  onEditTicket,
  onAssignTicket,
  onQuickStatusChange,
  sortConfig = defaultSortConfig,
  onSort,
}: TicketTableViewProps) => {
  const navigate = useNavigate();
  const noopSort = () => {};

  const getSLAIndicator = (ticket: any) => {
    if (!ticket.sla_due_date) return null;
    const dueDate = new Date(ticket.sla_due_date);
    const now = new Date();
    const isBreached = isSLABreached(ticket);
    if (['resolved', 'closed'].includes(ticket.status)) return null;
    if (isBreached) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>
            <p>SLA Breached - was due {formatDistanceToNow(dueDate, { addSuffix: true })}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue < 2) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <Clock className="h-3.5 w-3.5 text-orange-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>SLA due {formatDistanceToNow(dueDate, { addSuffix: true })}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return null;
  };

  const getRowClassName = (ticket: any) => {
    const classes = ["cursor-pointer hover:bg-muted/50 h-10"];
    if (isSLABreached(ticket)) {
      classes.push("bg-red-50/50 dark:bg-red-950/10");
    } else if (!ticket.assignee_id && ['open', 'in_progress'].includes(ticket.status)) {
      classes.push("bg-yellow-50/30 dark:bg-yellow-950/5");
    }
    if (ticket.priority === 'urgent') {
      classes.push("border-l-2 border-l-red-500");
    } else if (ticket.priority === 'high') {
      classes.push("border-l-2 border-l-orange-500");
    }
    return cn(...classes);
  };

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-muted-foreground mb-2">No tickets found</div>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new ticket.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border-0 overflow-auto h-full">
        <Table>
          <TableHeader>
            <TableRow className="h-8 bg-muted/30 hover:bg-muted/30">
              <SortableTableHeader column="" label="" sortConfig={defaultSortConfig} onSort={noopSort} className="w-8" />
              <SortableTableHeader column="ticket_number" label="#" sortConfig={sortConfig} onSort={onSort || noopSort} className="w-[90px]" />
              <SortableTableHeader column="request_type" label="Type" sortConfig={sortConfig} onSort={onSort || noopSort} className="w-[70px]" />
              <SortableTableHeader column="title" label="Title" sortConfig={sortConfig} onSort={onSort || noopSort} />
              <SortableTableHeader column="status" label="Status" sortConfig={sortConfig} onSort={onSort || noopSort} className="w-[90px]" />
              <SortableTableHeader column="priority" label="Priority" sortConfig={sortConfig} onSort={onSort || noopSort} className="w-[70px]" />
              <SortableTableHeader column="assignee" label="Assignee" sortConfig={sortConfig} onSort={onSort || noopSort} className="w-[110px]" />
              <SortableTableHeader column="category" label="Category" sortConfig={sortConfig} onSort={onSort || noopSort} className="w-[90px]" />
              <SortableTableHeader column="created_at" label="Created" sortConfig={sortConfig} onSort={onSort || noopSort} className="w-[90px]" />
              <SortableTableHeader column="" label="" sortConfig={defaultSortConfig} onSort={noopSort} className="w-[50px] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id} className={getRowClassName(ticket)}>
                <TableCell onClick={(e) => e.stopPropagation()} className="py-1">
                  <Checkbox
                    checked={selectedIds.includes(ticket.id)}
                    onCheckedChange={() => onSelectTicket(ticket.id)}
                    aria-label={`Select ticket ${ticket.ticket_number}`}
                  />
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</span>
                    {getSLAIndicator(ticket)}
                  </div>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1">
                  <span className="text-xs text-muted-foreground">
                    {ticket.request_type === 'service_request' ? 'Request' : 'Ticket'}
                  </span>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1">
                  <span className="text-sm truncate block max-w-[300px]" title={ticket.title}>{ticket.title}</span>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(ticket.status))} />
                    <span className="text-xs">{formatStatus(ticket.status)}</span>
                  </span>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1">
                  <span className={cn("text-xs capitalize", getPriorityTextColor(ticket.priority))}>{ticket.priority}</span>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1">
                  <span className="text-xs truncate block max-w-[100px]">
                    {getUserDisplayName(ticket.assignee) || (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </span>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1">
                  <span className="text-xs text-muted-foreground truncate block max-w-[80px]">{ticket.category?.name || '-'}</span>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1">
                  <span className="text-xs text-muted-foreground">
                    <FormattedDate date={ticket.created_at} format="short" />
                  </span>
                </TableCell>
                <TableCell className="py-1 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="More actions">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => navigate(`/tickets/${ticket.id}`)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditTicket?.(ticket)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAssignTicket?.(ticket)}>Assign</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onQuickStatusChange?.(ticket.id, 'in_progress')} disabled={ticket.status === 'in_progress'}>Set In Progress</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onQuickStatusChange?.(ticket.id, 'on_hold')} disabled={ticket.status === 'on_hold'}>Set On Hold</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onQuickStatusChange?.(ticket.id, 'resolved')} disabled={ticket.status === 'resolved'}>Set Resolved</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};
