import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Eye, UserPlus, Clock, AlertTriangle, MoreHorizontal } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
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

interface TicketTableViewProps {
  tickets: any[];
  selectedIds: number[];
  onSelectTicket: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
  onEditTicket?: (ticket: any) => void;
  onAssignTicket?: (ticket: any) => void;
  onQuickStatusChange?: (ticketId: number, status: string) => void;
}

export const TicketTableView = ({ 
  tickets, 
  selectedIds, 
  onSelectTicket, 
  onSelectAll,
  onEditTicket,
  onAssignTicket,
  onQuickStatusChange
}: TicketTableViewProps) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'on_hold': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'high': return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'low': return 'bg-green-500 hover:bg-green-600 text-white';
      default: return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  const isSLABreached = (ticket: any) => {
    if (ticket.sla_breached) return true;
    if (ticket.sla_due_date && new Date(ticket.sla_due_date) < new Date() && 
        !['resolved', 'closed'].includes(ticket.status)) {
      return true;
    }
    return false;
  };

  const getSLAIndicator = (ticket: any) => {
    if (!ticket.sla_due_date) return null;
    
    const dueDate = new Date(ticket.sla_due_date);
    const now = new Date();
    const isBreached = isSLABreached(ticket);
    
    if (['resolved', 'closed'].includes(ticket.status)) {
      return null;
    }
    
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

  return (
    <div className="border rounded-lg overflow-hidden text-[0.85rem]">
      <Table>
        <TableHeader>
          <TableRow className="h-9">
            <TableHead className="w-10 py-2">
              <Checkbox
                checked={selectedIds.length === tickets.length && tickets.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead className="py-2">Request #</TableHead>
            <TableHead className="py-2">Type</TableHead>
            <TableHead className="py-2">Title</TableHead>
            <TableHead className="py-2">Status</TableHead>
            <TableHead className="py-2">Priority</TableHead>
            <TableHead className="py-2">Assignee</TableHead>
            <TableHead className="py-2">Created By</TableHead>
            <TableHead className="py-2">Category</TableHead>
            <TableHead className="py-2">Created</TableHead>
            <TableHead className="text-right py-2">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow 
              key={ticket.id} 
              className={`cursor-pointer hover:bg-muted/50 h-11 ${isSLABreached(ticket) ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
            >
              <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
                <Checkbox
                  checked={selectedIds.includes(ticket.id)}
                  onCheckedChange={() => onSelectTicket(ticket.id)}
                />
              </TableCell>
              <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[0.85rem]">
                    {ticket.ticket_number}
                  </span>
                  {getSLAIndicator(ticket)}
                </div>
              </TableCell>
              <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                <Badge variant="outline" className="text-[0.75rem] px-1.5 py-0.5">
                  {ticket.request_type === 'service_request' ? 'Service Request' : 'Ticket'}
                </Badge>
              </TableCell>
              <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                <div className="w-64 min-w-[16rem] max-w-[16rem]">
                  <div className="font-medium truncate text-[0.85rem]">{ticket.title}</div>
                </div>
              </TableCell>
              <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                <span className="text-[0.85rem] capitalize">
                  {ticket.status.replace('_', ' ')}
                </span>
              </TableCell>
              <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                <span className="text-[0.85rem] capitalize">
                  {ticket.priority}
                </span>
              </TableCell>
              <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                {getUserDisplayName(ticket.assignee) || (
                  <span className="text-muted-foreground italic text-[0.8rem]">Unassigned</span>
                )}
              </TableCell>
              <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                {getUserDisplayName(ticket.created_by_user) || (
                  <span className="text-muted-foreground italic text-[0.8rem]">Unknown</span>
                )}
              </TableCell>
              <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                {ticket.category?.name || '-'}
              </TableCell>
              <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                <div className="text-[0.8rem]">
                  {format(new Date(ticket.created_at), 'MMM dd, yyyy')}
                </div>
              </TableCell>
              <TableCell className="text-right py-1.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    title="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTicket?.(ticket);
                    }}
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAssignTicket?.(ticket)}>
                        <UserPlus className="h-3.5 w-3.5 mr-2" />
                        Assign
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onQuickStatusChange?.(ticket.id, 'in_progress')}
                        disabled={ticket.status === 'in_progress'}
                      >
                        Set In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onQuickStatusChange?.(ticket.id, 'on_hold')}
                        disabled={ticket.status === 'on_hold'}
                      >
                        Set On Hold
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onQuickStatusChange?.(ticket.id, 'resolved')}
                        disabled={ticket.status === 'resolved'}
                      >
                        Set Resolved
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};