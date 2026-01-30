import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X, ExternalLink, Clock, User, Tag, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TicketQuickPreviewProps {
  ticketId: number;
  onClose: () => void;
}

export const TicketQuickPreview = ({ ticketId, onClose }: TicketQuickPreviewProps) => {
  const navigate = useNavigate();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket-preview", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select(`
          *,
          requester:users!helpdesk_tickets_requester_id_fkey(name, email),
          assignee:users!helpdesk_tickets_assignee_id_fkey(name, email),
          category:helpdesk_categories(name)
        `)
        .eq("id", ticketId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: comments } = useQuery({
    queryKey: ["ticket-preview-comments", ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from("helpdesk_ticket_comments")
        .select("*, user:users(name)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!ticketId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (isLoading) {
    return (
      <Card className="w-80">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ticket) return null;

  return (
    <Card className="w-80 shadow-lg">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-mono text-xs text-muted-foreground">
                {ticket.ticket_number}
              </span>
              <Badge className={`${getPriorityColor(ticket.priority)} text-[0.65rem] px-1.5 py-0`}>
                {ticket.priority}
              </Badge>
            </div>
            <CardTitle className="text-sm line-clamp-2">{ticket.title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`${getStatusColor(ticket.status)} text-[0.65rem]`}>
            {ticket.status.replace('_', ' ')}
          </Badge>
          {ticket.category?.name && (
            <Badge variant="secondary" className="text-[0.65rem]">
              {ticket.category.name}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-3">
          {ticket.description}
        </p>

        <Separator />

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Requester:</span>
            <span className="font-medium">{ticket.requester?.name || "Unknown"}</span>
          </div>
          {ticket.assignee && (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Assigned:</span>
              <span className="font-medium">{ticket.assignee.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {comments && comments.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span>Recent Comments</span>
              </div>
              <ScrollArea className="h-20">
                <div className="space-y-2">
                  {comments.map((c: any) => (
                    <div key={c.id} className="text-xs">
                      <span className="font-medium">{c.user?.name}: </span>
                      <span className="text-muted-foreground line-clamp-2">{c.comment}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-7 text-xs"
          onClick={() => navigate(`/tickets/${ticketId}`)}
        >
          <ExternalLink className="h-3 w-3 mr-1.5" />
          View Full Details
        </Button>
      </CardContent>
    </Card>
  );
};