import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Link as LinkIcon, Trash2, Loader2 } from "lucide-react";

interface EditProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problem: any;
}

export function EditProblemDialog({ open, onOpenChange, problem }: EditProblemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [formData, setFormData] = useState({
    title: problem?.title || "",
    description: problem?.description || "",
    priority: problem?.priority || "medium",
    status: problem?.status || "open",
    root_cause: problem?.root_cause || "",
    workaround: problem?.workaround || "",
  });

  const { data: linkedTickets } = useQuery({
    queryKey: ["helpdesk-problem-tickets", problem?.id],
    queryFn: async () => {
      if (!problem?.id) return [];
      const { data } = await supabase
        .from("helpdesk_problem_tickets")
        .select("*, ticket:helpdesk_tickets(id, ticket_number, title, status, priority)")
        .eq("problem_id", problem.id);
      return data || [];
    },
    enabled: !!problem?.id && open,
  });

  const { data: availableTickets = [] } = useQuery({
    queryKey: ["helpdesk-tickets-for-link", problem?.organisation_id],
    queryFn: async () => {
      if (!problem?.organisation_id) return [];
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select("id, ticket_number, title, status, priority")
        .eq("organisation_id", problem.organisation_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!problem?.organisation_id && open,
  });

  const linkTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("helpdesk_problem_tickets")
        .insert({
          problem_id: problem.id,
          ticket_id: parseInt(ticketId),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Ticket linked to problem",
      });
      setSelectedTicketId("");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problem-tickets", problem.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to link ticket: " + error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "Ticket unlinked",
      });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problem-tickets", problem.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to unlink ticket: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("helpdesk_problems")
        .update({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: formData.status,
          root_cause: formData.root_cause || null,
          workaround: formData.workaround || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", problem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Problem updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["helpdesk-problems"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Problem - {problem?.problem_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="known_error">Known Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="root_cause">Root Cause</Label>
            <Textarea
              id="root_cause"
              value={formData.root_cause}
              onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
              rows={3}
              placeholder="Describe the root cause of the problem..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workaround">Workaround</Label>
            <Textarea
              id="workaround"
              value={formData.workaround}
              onChange={(e) => setFormData({ ...formData, workaround: e.target.value })}
              rows={3}
              placeholder="Describe any temporary workarounds..."
            />
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <h4 className="text-sm font-medium">Linked Tickets ({linkedTickets?.length || 0})</h4>
            </div>

            {linkedTickets && linkedTickets.length > 0 && (
              <div className="space-y-2">
                {linkedTickets.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-2 border rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {link.ticket?.ticket_number}
                      </Badge>
                      <span className="truncate">{link.ticket?.title}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => unlinkTicket.mutate(link.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

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
                type="button"
                size="sm"
                onClick={() => selectedTicketId && linkTicket.mutate(selectedTicketId)}
                disabled={!selectedTicketId || linkTicket.isPending}
              >
                {linkTicket.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Link
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
