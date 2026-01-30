import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

interface TicketCardViewProps {
  tickets: any[];
  selectedIds: number[];
  onSelectTicket: (id: number) => void;
  onEditTicket?: (ticket: any) => void;
  onAssignTicket?: (ticket: any) => void;
  onQuickStatusChange?: (ticketId: number, status: string) => void;
}

export const TicketCardView = ({ 
  tickets, 
  selectedIds, 
  onSelectTicket,
  onEditTicket,
  onAssignTicket,
  onQuickStatusChange
}: TicketCardViewProps) => {
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
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tickets.map((ticket) => (
        <Card 
          key={ticket.id} 
          className={`cursor-pointer hover:shadow-md transition-shadow ${isSLABreached(ticket) ? 'border-destructive/50 bg-destructive/5' : ''}`}
          onClick={() => navigate(`/tickets/${ticket.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(ticket.id)}
                  onCheckedChange={() => onSelectTicket(ticket.id)}
                />
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">
                    {ticket.ticket_number}
                  </span>
                  <Badge variant="outline" className="text-[0.65rem] px-1.5 py-0">
                    {ticket.request_type === 'service_request' ? 'SR' : 'TKT'}
                  </Badge>
                  {isSLABreached(ticket) && (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </div>
                
                <h4 className="font-medium text-sm line-clamp-2">{ticket.title}</h4>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {ticket.description}
                </p>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`${getStatusColor(ticket.status)} text-[0.65rem] px-1.5 py-0`}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={`${getPriorityColor(ticket.priority)} text-[0.65rem] px-1.5 py-0`}>
                    {ticket.priority}
                  </Badge>
                  {ticket.category?.name && (
                    <Badge variant="secondary" className="text-[0.65rem] px-1.5 py-0">
                      {ticket.category.name}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                  </div>
                  
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEditTicket?.(ticket)}
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
                          onClick={() => onQuickStatusChange?.(ticket.id, 'resolved')}
                          disabled={ticket.status === 'resolved'}
                        >
                          Set Resolved
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {ticket.assignee?.name && (
                  <div className="text-xs text-muted-foreground">
                    Assigned to: <span className="font-medium">{ticket.assignee.name}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};