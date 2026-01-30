import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Clock, User, Tag, MessageSquare, Edit, UserPlus, FileText, History, Paperclip, Link, Trash2, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { EditTicketDialog } from "@/components/helpdesk/EditTicketDialog";
import { AssignTicketDialog } from "@/components/helpdesk/AssignTicketDialog";
import { TimeTrackingPanel } from "@/components/helpdesk/TimeTrackingPanel";
import { TicketWatchersPanel } from "@/components/helpdesk/TicketWatchersPanel";
import { CannedResponsesSelector } from "@/components/helpdesk/CannedResponsesSelector";
import { InternalNoteToggle } from "@/components/helpdesk/InternalNoteToggle";
import { SLAStatusBanner } from "@/components/helpdesk/SLAStatusBanner";
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

export default function TicketDetail() {
  const { id: ticketId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [comment, setComment] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Open edit or assign dialog based on URL params
  useEffect(() => {
    if (searchParams.get("edit") === "true") {
      setEditDialog(true);
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
    if (searchParams.get("assign") === "true") {
      setAssignDialog(true);
      searchParams.delete("assign");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["helpdesk-ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select(`
          *,
          requester:users!helpdesk_tickets_requester_id_fkey(name, email),
          assignee:users!helpdesk_tickets_assignee_id_fkey(name, email),
          category:helpdesk_categories(name),
          created_by_user:users!helpdesk_tickets_created_by_fkey(name, email)
        `)
        .eq("id", parseInt(ticketId!))
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: comments } = useQuery({
    queryKey: ["helpdesk-ticket-comments", ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from("helpdesk_ticket_comments")
        .select("*, user:users(name, email)")
        .eq("ticket_id", parseInt(ticketId!))
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!ticketId,
  });

  const { data: history } = useQuery({
    queryKey: ["helpdesk-ticket-history", ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from("helpdesk_ticket_history")
        .select("*, user:users(name, email)")
        .eq("ticket_id", parseInt(ticketId!))
        .order("timestamp", { ascending: false });
      return data || [];
    },
    enabled: !!ticketId,
  });

  const { data: attachments } = useQuery({
    queryKey: ["helpdesk-ticket-attachments", ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from("helpdesk_ticket_attachments")
        .select("*, uploaded_by_user:users!helpdesk_ticket_attachments_uploaded_by_fkey(name, email)")
        .eq("ticket_id", parseInt(ticketId!))
        .order("uploaded_at", { ascending: false });
      return data || [];
    },
    enabled: !!ticketId,
  });

  const { data: linkedProblems } = useQuery({
    queryKey: ["helpdesk-problem-tickets", ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from("helpdesk_problem_tickets")
        .select("*, problem:helpdesk_problems(id, problem_number, title, status)")
        .eq("ticket_id", parseInt(ticketId!));
      return data || [];
    },
    enabled: !!ticketId,
  });

  const { data: availableProblems = [] } = useQuery({
    queryKey: ["helpdesk-problems-for-link", ticket?.organisation_id],
    queryFn: async () => {
      if (!ticket?.organisation_id) return [];
      const { data, error } = await supabase
        .from("helpdesk_problems")
        .select("id, problem_number, title, status")
        .eq("organisation_id", ticket.organisation_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!ticket?.organisation_id,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("users")
        .select("id, organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      return data;
    },
  });

  const addComment = useMutation({
    mutationFn: async (commentText: string) => {
      if (!currentUser || !ticket) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      const { error } = await supabase.from("helpdesk_ticket_comments").insert({
        ticket_id: parseInt(ticketId!),
        user_id: currentUser.id,
        comment: commentText,
        tenant_id: profileData?.tenant_id || ticket.tenant_id,
        is_internal: isInternalNote,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isInternalNote ? "Internal note added" : "Comment added");
      setComment("");
      setIsInternalNote(false);
      queryClient.invalidateQueries({ queryKey: ["helpdesk-ticket-comments", ticketId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to add comment: " + error.message);
    },
  });

  const [selectedProblemId, setSelectedProblemId] = useState("");

  const linkProblem = useMutation({
    mutationFn: async (problemId: string) => {
      if (linkedProblems && linkedProblems.length > 0) {
        throw new Error("This ticket is already linked to a problem. Please unlink first.");
      }
      
      const { error } = await supabase
        .from("helpdesk_problem_tickets")
        .insert({
          ticket_id: parseInt(ticketId!),
          problem_id: parseInt(problemId),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Problem linked to ticket");
      setSelectedProblemId("");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problem-tickets", ticketId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to link problem");
    },
  });

  const unlinkProblem = useMutation({
    mutationFn: async (linkId: number) => {
      const { error } = await supabase
        .from("helpdesk_problem_tickets")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Problem unlinked");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problem-tickets", ticketId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to unlink problem: " + error.message);
    },
  });

  const createProblemFromTicket = useMutation({
    mutationFn: async () => {
      if (!ticket) throw new Error("Ticket not found");
      if (linkedProblems && linkedProblems.length > 0) {
        throw new Error("This ticket is already linked to a problem");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: currentUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!currentUser) throw new Error("User not found");

      const { data: problemNumber } = await supabase.rpc("generate_problem_number", {
        p_tenant_id: ticket.tenant_id,
        p_org_id: ticket.organisation_id,
      });

      const { data: newProblem, error: problemError } = await supabase
        .from("helpdesk_problems")
        .insert({
          problem_number: problemNumber,
          title: `Problem: ${ticket.title}`,
          description: `Root cause analysis for ticket ${ticket.ticket_number}:\n\n${ticket.description}`,
          priority: ticket.priority,
          status: "investigating",
          tenant_id: ticket.tenant_id,
          organisation_id: ticket.organisation_id,
          created_by: currentUser.id,
          category_id: ticket.category_id,
        })
        .select()
        .single();

      if (problemError) throw problemError;

      const { error: linkError } = await supabase
        .from("helpdesk_problem_tickets")
        .insert({
          ticket_id: parseInt(ticketId!),
          problem_id: newProblem.id,
        });

      if (linkError) throw linkError;

      return newProblem;
    },
    onSuccess: (newProblem) => {
      toast.success("Problem created and linked to ticket");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problem-tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problems"] });
      navigate(`/problems/${newProblem.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create problem");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const updates: any = { status };
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
      } else if (status === "closed") {
        updates.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("helpdesk_tickets")
        .update(updates)
        .eq("id", parseInt(ticketId!));

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-dashboard-stats"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const deleteTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("helpdesk_tickets")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", parseInt(ticketId!));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets-all"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-dashboard-stats"] });
      navigate("/tickets");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete ticket: " + error.message);
    },
  });

  const handleCannedResponseSelect = (content: string) => {
    setComment((prev) => prev + (prev ? "\n\n" : "") + content);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Ticket not found</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 py-2">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="outline" className="font-mono text-sm px-2 py-0.5 shrink-0">
              {ticket.ticket_number}
            </Badge>
            <Badge className={`${getPriorityColor(ticket.priority)} text-white text-xs px-2 py-0.5 shrink-0`}>
              {ticket.priority}
            </Badge>
            {ticket.category && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 shrink-0">{ticket.category.name}</Badge>
            )}
          </div>

          <div className="flex gap-2 shrink-0 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/tickets")}
              className="h-8"
            >
              All Tickets
            </Button>
            <Select
              value={newStatus || ticket.status}
              onValueChange={(value) => {
                setNewStatus(value);
                updateStatus.mutate(value);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignDialog(true)}
              className="h-8"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialog(true)}
              className="h-8"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1 truncate">{ticket.title}</h1>
          <p className="text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* SLA Status Banner */}
        {ticket.sla_due_date && (
          <div className="mb-3">
            <SLAStatusBanner
              slaDueDate={ticket.sla_due_date}
              slaBreached={ticket.sla_breached}
              status={ticket.status}
              createdAt={ticket.created_at}
            />
          </div>
        )}

        {/* Main Content with Sidebar */}
        <div className="flex gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-9">
                <TabsTrigger value="details" className="text-xs px-2 py-1.5">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs px-2 py-1.5">
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  Comments ({comments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs px-2 py-1.5">
                  <History className="h-3.5 w-3.5 mr-1" />
                  History
                </TabsTrigger>
                <TabsTrigger value="attachments" className="text-xs px-2 py-1.5">
                  <Paperclip className="h-3.5 w-3.5 mr-1" />
                  Attachments ({attachments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="problems" className="text-xs px-2 py-1.5">
                  <Link className="h-3.5 w-3.5 mr-1" />
                  Problems ({linkedProblems?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-3">
                <Card>
                  <CardContent className="pt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Description</p>
                      <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
                    </div>

                    <Separator />

                    {linkedProblems && linkedProblems.length > 0 && (
                      <>
                        <div className="bg-muted/50 p-3 rounded-lg border">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Link className="h-4 w-4 text-primary" />
                              <p className="font-medium text-sm">Linked Problem</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unlinkProblem.mutate(linkedProblems[0].id)}
                              className="h-6 px-2"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {linkedProblems[0].problem?.problem_number}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {linkedProblems[0].problem?.status?.replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="text-sm">{linkedProblems[0].problem?.title}</p>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => navigate(`/problems/${linkedProblems[0].problem.id}`)}
                            >
                              View Problem Details →
                            </Button>
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    <div className="flex items-start gap-2">
                      <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Requester</p>
                        <p className="font-medium truncate">{getUserDisplayName(ticket.requester) || "Unknown"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Created by</p>
                        <p className="font-medium truncate">{getUserDisplayName(ticket.created_by_user) || "Unknown"}</p>
                      </div>
                    </div>

                    {ticket.assignee && (
                      <div className="flex items-start gap-2">
                        <Tag className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Assigned to</p>
                          <p className="font-medium truncate">{getUserDisplayName(ticket.assignee) || "Unknown"}</p>
                        </div>
                      </div>
                    )}

                    {ticket.sla_due_date && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">SLA Due</p>
                          <p className="font-medium">
                            in {formatDistanceToNow(new Date(ticket.sla_due_date))}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comments" className="mt-3">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    {comments && comments.length > 0 ? (
                      comments.map((c: any) => (
                        <div 
                          key={c.id} 
                          className={`border-b pb-3 last:border-0 ${c.is_internal ? 'bg-amber-50 dark:bg-amber-950/20 -mx-4 px-4 py-2 border-l-4 border-l-amber-400' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{getUserDisplayName(c.user) || "Unknown"}</span>
                              {c.is_internal && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Lock className="h-2.5 w-2.5" />
                                  Internal
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-3">No comments yet</p>
                    )}

                    <div className="pt-3 space-y-3 border-t">
                      <div className="flex items-center justify-between">
                        <InternalNoteToggle 
                          checked={isInternalNote} 
                          onCheckedChange={setIsInternalNote} 
                        />
                        <CannedResponsesSelector onSelect={handleCannedResponseSelect} />
                      </div>
                      <Textarea
                        placeholder={isInternalNote ? "Add an internal note (only visible to agents)..." : "Add a comment..."}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className={`text-sm ${isInternalNote ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => comment.trim() && addComment.mutate(comment)}
                        disabled={!comment.trim() || addComment.isPending}
                      >
                        {addComment.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        {isInternalNote ? "Add Internal Note" : "Add Comment"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-3">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    {history && history.length > 0 ? (
                      history.map((h: any) => (
                        <div key={h.id} className="border-b pb-3 last:border-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-sm">{getUserDisplayName(h.user) || "System"}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(h.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm">
                            <span className="font-medium">{h.field_name}:</span>{" "}
                            <span className="text-muted-foreground">{h.old_value || "—"}</span>
                            {" → "}
                            <span>{h.new_value || "—"}</span>
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-3">No history yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attachments" className="mt-3">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    {attachments && attachments.length > 0 ? (
                      attachments.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{a.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getUserDisplayName(a.uploaded_by_user) || "Unknown"} •{" "}
                                {formatDistanceToNow(new Date(a.uploaded_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" asChild>
                            <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                              Download
                            </a>
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-3">No attachments</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="problems" className="mt-3">
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    {linkedProblems && linkedProblems.length > 0 ? (
                      <div className="space-y-2">
                        <div className="bg-muted/50 p-4 rounded-lg border">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <h4 className="font-medium">Linked Problem</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                This ticket is part of a larger problem investigation
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unlinkProblem.mutate(linkedProblems[0].id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {linkedProblems[0].problem?.problem_number}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {linkedProblems[0].problem?.status?.replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="font-medium">{linkedProblems[0].problem?.title}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/problems/${linkedProblems[0].problem.id}`)}
                            >
                              View Problem Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 space-y-4">
                        <p className="text-sm text-muted-foreground">
                          No problem linked to this ticket yet
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                          <Button
                            variant="outline"
                            onClick={() => createProblemFromTicket.mutate()}
                            disabled={createProblemFromTicket.isPending}
                          >
                            {createProblemFromTicket.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Create Problem from Ticket
                          </Button>
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Link to Existing Problem</label>
                      <p className="text-xs text-muted-foreground">
                        Link this ticket to an existing problem if it's related to a known root cause
                      </p>
                      <div className="flex gap-2">
                        <Select 
                          value={selectedProblemId} 
                          onValueChange={setSelectedProblemId}
                          disabled={linkedProblems && linkedProblems.length > 0}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a problem to link" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProblems
                              .filter(
                                (problem) =>
                                  !linkedProblems?.some((link: any) => link.problem_id === problem.id)
                              )
                              .map((problem) => (
                                <SelectItem key={problem.id} value={problem.id.toString()}>
                                  {problem.problem_number} - {problem.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => selectedProblemId && linkProblem.mutate(selectedProblemId)}
                          disabled={!selectedProblemId || linkProblem.isPending || (linkedProblems && linkedProblems.length > 0)}
                        >
                          {linkProblem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Link
                        </Button>
                      </div>
                      {linkedProblems && linkedProblems.length > 0 && (
                        <p className="text-xs text-amber-600">
                          Unlink the current problem before linking to a different one
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="w-72 shrink-0 space-y-3 hidden lg:block">
            <TimeTrackingPanel ticketId={parseInt(ticketId!)} />
            <TicketWatchersPanel 
              ticketId={parseInt(ticketId!)} 
              organisationId={ticket.organisation_id} 
            />
          </div>
        </div>
      </div>

      <EditTicketDialog
        open={editDialog}
        onOpenChange={setEditDialog}
        ticket={ticket}
      />

      <AssignTicketDialog
        open={assignDialog}
        onOpenChange={setAssignDialog}
        ticket={ticket}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the ticket
              "{ticket.title}" and all its comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTicket.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTicket.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
