import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Link, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EditProblemDialog } from "@/components/helpdesk/EditProblemDialog";
import { getUserDisplayName } from "@/lib/userUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function HelpdeskProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: problem, isLoading } = useQuery({
    queryKey: ["helpdesk-problem", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_problems")
        .select(
          `*,
           category:helpdesk_categories(name)
          `
        )
        .eq("id", Number(id))
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: createdByUser } = useQuery({
    queryKey: ["problem-created-by", problem?.created_by],
    queryFn: async () => {
      if (!problem?.created_by) return null;
      const { data } = await supabase
        .from("users")
        .select("name, email")
        .eq("auth_user_id", problem.created_by)
        .maybeSingle();
      return data;
    },
    enabled: !!problem?.created_by,
  });

  const { data: assignedToUser } = useQuery({
    queryKey: ["problem-assignee", problem?.assigned_to],
    queryFn: async () => {
      if (!problem?.assigned_to) return null;
      const { data } = await supabase
        .from("users")
        .select("name, email")
        .eq("auth_user_id", problem.assigned_to)
        .maybeSingle();
      return data;
    },
    enabled: !!problem?.assigned_to,
  });

  const { data: linkedTickets } = useQuery({
    queryKey: ["helpdesk-problem-tickets", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("helpdesk_problem_tickets")
        .select("*, ticket:helpdesk_tickets(id, ticket_number, title, status, priority)")
        .eq("problem_id", parseInt(id!));
      return data || [];
    },
    enabled: !!id,
  });

  // Single-company mode: fetch all non-deleted tickets
  const { data: availableTickets = [] } = useQuery({
    queryKey: ["helpdesk-tickets-for-link"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select("id, ticket_number, title, status, priority")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const linkTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("helpdesk_problem_tickets")
        .insert({
          problem_id: parseInt(id!),
          ticket_id: parseInt(ticketId),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket linked to problem");
      setSelectedTicketId("");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problem-tickets", id] });
    },
    onError: (error: Error) => {
      toast.error("Failed to link ticket: " + error.message);
    },
  });

  const unlinkTicket = useMutation({
    mutationFn: async (linkId: number) => {
      const { error } = await supabase
        .from("helpdesk_problem_tickets")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket unlinked");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problem-tickets", id] });
    },
    onError: (error: Error) => {
      toast.error("Failed to unlink ticket: " + error.message);
    },
  });

  const deleteProblem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("helpdesk_problems")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", Number(id));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Problem deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problems"] });
      navigate("/problems");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete problem: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold">Problem not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Problems
        </Button>
      </div>
    );
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-sm px-2 py-0.5">
            {problem.problem_number}
          </Badge>
          {problem.priority && (
            <Badge className={getPriorityColor(problem.priority)}>
              {problem.priority}
            </Badge>
          )}
          {problem.status && (
            <Badge variant="outline" className="capitalize">
              {problem.status.replace("_", " ")}
            </Badge>
          )}
          {problem.category && (
            <Badge variant="outline">{problem.category.name}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/problems")}>
            All Problems
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{problem.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {problem.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {problem.description}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Assigned to</div>
              <div>
                {getUserDisplayName(assignedToUser) || (problem.assigned_to ? "Unknown" : "Unassigned")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Created by</div>
              <div>
                {getUserDisplayName(createdByUser) || (problem.created_by ? "Unknown" : "Unknown")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Created at</div>
              <div>
                {problem.created_at
                  ? format(new Date(problem.created_at), "MMM dd, yyyy HH:mm")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Resolved at</div>
              <div>
                {problem.resolved_at
                  ? format(new Date(problem.resolved_at), "MMM dd, yyyy HH:mm")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Closed at</div>
              <div>
                {problem.closed_at
                  ? format(new Date(problem.closed_at), "MMM dd, yyyy HH:mm")
                  : "-"}
              </div>
            </div>
          </div>

          {(problem.root_cause || problem.workaround || problem.solution) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {problem.root_cause && (
                <div>
                  <div className="font-medium mb-1">Root cause</div>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {problem.root_cause}
                  </p>
                </div>
              )}
              {problem.workaround && (
                <div>
                  <div className="font-medium mb-1">Workaround</div>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {problem.workaround}
                  </p>
                </div>
              )}
              {problem.solution && (
                <div>
                  <div className="font-medium mb-1">Solution</div>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {problem.solution}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Linked Tickets ({linkedTickets?.length || 0})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            All tickets related to this root cause problem
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkedTickets && linkedTickets.length > 0 && (
            <div className="space-y-2">
              {linkedTickets.map((link: any) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge variant="outline" className="font-mono text-xs shrink-0">
                      {link.ticket?.ticket_number}
                    </Badge>
                    <span className="text-sm font-medium truncate">
                      {link.ticket?.title}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize shrink-0">
                      {link.ticket?.status?.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/helpdesk/tickets/${link.ticket.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unlinkTicket.mutate(link.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Link Ticket</label>
            <div className="flex gap-2">
              <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a ticket to link" />
                </SelectTrigger>
                <SelectContent>
                  {availableTickets
                    .filter(
                      (ticket) =>
                        !linkedTickets?.some((link: any) => link.ticket_id === ticket.id)
                    )
                    .map((ticket) => (
                      <SelectItem key={ticket.id} value={ticket.id.toString()}>
                        {ticket.ticket_number} - {ticket.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => selectedTicketId && linkTicket.mutate(selectedTicketId)}
                disabled={!selectedTicketId || linkTicket.isPending}
              >
                {linkTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {problem && (
        <EditProblemDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          problem={problem}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Problem?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the problem
              "{problem?.title}" and all its linked tickets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProblem.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProblem.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
