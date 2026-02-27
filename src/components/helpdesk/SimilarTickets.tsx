import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchInput } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface SimilarTicketsProps {
  ticketId: number;
  title: string;
}

export const SimilarTickets = ({ ticketId, title }: SimilarTicketsProps) => {
  const { data: similarTickets = [] } = useQuery({
    queryKey: ["similar-tickets", ticketId, title],
    queryFn: async () => {
      if (!title || title.length < 5) return [];

      // Extract keywords from title (simple approach)
      const keywords = title
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .slice(0, 5);

      if (keywords.length === 0) return [];

      // Single-company mode: RLS handles access control, no org filter needed
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select("id, ticket_number, title, status, priority, resolved_at")
        .neq("id", ticketId)
        .eq("is_deleted", false)
        .or(`title.ilike.%${sanitizeSearchInput(keywords[0])}%,description.ilike.%${sanitizeSearchInput(keywords[0])}%`)
        .limit(5);

      if (error) throw error;

      // Calculate relevance score
      return (data || [])
        .map((ticket: any) => {
          let score = 0;
          const ticketTitle = ticket.title?.toLowerCase() || "";
          keywords.forEach((keyword) => {
            if (ticketTitle.includes(keyword)) score++;
          });
          return { ...ticket, relevanceScore: score };
        })
        .filter((t: any) => t.relevanceScore > 0)
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);
    },
    enabled: !!title && title.length >= 5,
  });

  if (similarTickets.length === 0) return null;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Similar Tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {similarTickets.map((ticket: any) => (
          <Link
            key={ticket.id}
            to={`/tickets/${ticket.id}`}
            className="block p-2 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {ticket.ticket_number}
                  </Badge>
                  <Badge className={`${getStatusBadge(ticket.status)} text-xs`}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm truncate">{ticket.title}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};
