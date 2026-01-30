import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { FormattedDate } from "@/components/FormattedDate";
import { Loader2 } from "lucide-react";

export function RecentTicketsList() {
  const navigate = useNavigate();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["recent-tickets"],
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 5 * 60 * 1000,     // 5 minutes cache retention
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select("id, ticket_number, title, status, priority, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8 text-sm">
        No recent tickets
      </p>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "default";
      case "in_progress":
        return "secondary";
      case "resolved":
        return "outline";
      case "closed":
        return "outline";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
          onClick={() => navigate(`/tickets/${ticket.id}`)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-muted-foreground">
                {ticket.ticket_number}
              </span>
              <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                {ticket.priority}
              </Badge>
            </div>
            <p className="text-sm font-medium truncate">{ticket.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <FormattedDate date={ticket.created_at} format="short" />
            </p>
          </div>
          <Badge variant={getStatusColor(ticket.status)} className="ml-2">
            {ticket.status.replace("_", " ")}
          </Badge>
        </div>
      ))}
    </div>
  );
}
