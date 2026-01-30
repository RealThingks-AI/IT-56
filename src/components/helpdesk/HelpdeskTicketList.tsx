import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Loader2, AlertCircle, Edit, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EditTicketDialog } from "./EditTicketDialog";
import { AssignTicketDialog } from "./AssignTicketDialog";

interface HelpdeskTicketListProps {
  status?: string;
}

export const HelpdeskTicketList = ({ status }: HelpdeskTicketListProps) => {
  const navigate = useNavigate();
  const [editDialog, setEditDialog] = useState<{ open: boolean; ticket: any }>({ open: false, ticket: null });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; ticket: any }>({ open: false, ticket: null });

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ["helpdesk-tickets", status],
    queryFn: async () => {
      let query = supabase
        .from("helpdesk_tickets")
        .select(`
          *,
          requester:users!helpdesk_tickets_requester_id_fkey(name, email),
          assignee:users!helpdesk_tickets_assignee_id_fkey(name, email),
          category:helpdesk_categories(name)
        `)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500 hover:bg-red-600";
      case "high": return "bg-orange-500 hover:bg-orange-600";
      case "medium": return "bg-yellow-500 hover:bg-yellow-600";
      case "low": return "bg-green-500 hover:bg-green-600";
      default: return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "in_progress": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "closed": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "on_hold": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">Failed to load tickets</p>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No tickets found</p>
            <p className="text-sm text-muted-foreground">
              {status ? `No ${status.replace("_", " ")} tickets at the moment.` : "Create your first ticket to get started."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {tickets.map((ticket: any) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/helpdesk/tickets/${ticket.id}`)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="font-mono">
                      {ticket.ticket_number}
                    </Badge>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Badge variant="secondary" className={getStatusColor(ticket.status)}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    {ticket.category && (
                      <Badge variant="outline">{ticket.category.name}</Badge>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold mb-1 truncate">{ticket.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {ticket.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Requester: <span className="text-foreground font-medium">{ticket.requester?.name || "Unknown"}</span>
                    </span>
                    {ticket.assignee && (
                      <span>
                        Assigned to: <span className="text-foreground font-medium">{ticket.assignee.name}</span>
                      </span>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssignDialog({ open: true, ticket });
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditDialog({ open: true, ticket });
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditTicketDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, ticket: null })}
        ticket={editDialog.ticket}
      />

      <AssignTicketDialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog({ open, ticket: null })}
        ticket={assignDialog.ticket}
      />
    </>
  );
};
