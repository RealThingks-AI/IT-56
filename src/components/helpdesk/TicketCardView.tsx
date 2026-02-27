import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Eye, UserPlus, Clock, AlertTriangle, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStatusColor, getPriorityColor, isSLABreached } from "@/lib/ticketUtils";

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

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-muted-foreground mb-2">No tickets found</div>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new ticket.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
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
                  aria-label={`Select ticket ${ticket.ticket_number}`}
                />
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">
                    {ticket.ticket_number}
                  </span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {ticket.request_type === 'service_request' ? 'SR' : 'TKT'}
                  </Badge>
                  {isSLABreached(ticket) && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                
                <h4 className="font-medium text-sm line-clamp-2" title={ticket.title}>{ticket.title}</h4>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {ticket.description}
                </p>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`${getStatusColor(ticket.status)} text-xs px-1.5 py-0`}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={`${getPriorityColor(ticket.priority)} text-xs px-1.5 py-0`}>
                    {ticket.priority}
                  </Badge>
                  {ticket.category?.name && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
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
                      aria-label="View ticket"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEditTicket?.(ticket)}
                      aria-label="Edit ticket"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
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
