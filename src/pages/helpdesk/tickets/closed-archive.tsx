import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Archive, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { getPriorityBadgeColor } from "@/lib/ticketUtils";

export default function ClosedArchive() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: closedTickets, isLoading } = useQuery({
    queryKey: ["closed-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select(`
          *,
          category:helpdesk_categories(name),
          requester:users!helpdesk_tickets_requester_id_fkey(name),
          assignee:users!helpdesk_tickets_assignee_id_fkey(name)
        `)
        .in("status", ["resolved", "closed"])
        .order("closed_at", { ascending: false, nullsFirst: false })
        .order("resolved_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredTickets = closedTickets?.filter((ticket) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_number?.toLowerCase().includes(query) ||
      ticket.title?.toLowerCase().includes(query) ||
      ticket.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full px-4 py-4">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Closed Tickets Archive</h1>
        </div>
        
        <div className="relative w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket number, title, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTickets && filteredTickets.length > 0 ? (
        <div className="space-y-2">
          {filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        {ticket.ticket_number}
                      </Badge>
                      <Badge className="bg-gray-500 text-xs">
                        {ticket.status}
                      </Badge>
                      <Badge className={`${getPriorityBadgeColor(ticket.priority)} text-xs`}>
                        {ticket.priority}
                      </Badge>
                      {ticket.category && (
                        <Badge variant="outline" className="text-xs">{ticket.category.name}</Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold mb-0.5">{ticket.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </span>
                      {ticket.closed_at && (
                        <span>
                          Closed {formatDistanceToNow(new Date(ticket.closed_at), { addSuffix: true })}
                        </span>
                      )}
                      {ticket.resolved_at && !ticket.closed_at && (
                        <span>
                          Resolved {formatDistanceToNow(new Date(ticket.resolved_at), { addSuffix: true })}
                        </span>
                      )}
                      {ticket.assignee && (
                        <span>Assigned to: <span className="font-medium">{ticket.assignee.name}</span></span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
          <Archive className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No tickets found matching your search" : "No closed tickets in archive"}
          </p>
        </div>
      )}
    </div>
  );
}