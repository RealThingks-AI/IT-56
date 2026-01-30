import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Link as LinkIcon, Trash2 } from "lucide-react";

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["open", "in_progress", "on_hold", "resolved", "closed"]),
  category_id: z.string().optional(),
});

interface EditTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: any;
}

export const EditTicketDialog = ({ open, onOpenChange, ticket }: EditTicketDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedProblemId, setSelectedProblemId] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["helpdesk-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("helpdesk_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: linkedProblems } = useQuery({
    queryKey: ["helpdesk-problem-tickets", ticket?.id],
    queryFn: async () => {
      if (!ticket?.id) return [];
      const { data } = await supabase
        .from("helpdesk_problem_tickets")
        .select("*, problem:helpdesk_problems(id, problem_number, title, status)")
        .eq("ticket_id", ticket.id);
      return data || [];
    },
    enabled: !!ticket?.id && open,
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
    enabled: !!ticket?.organisation_id && open,
  });

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "open",
      category_id: "",
    },
  });

  useEffect(() => {
    if (ticket && open) {
      form.reset({
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        category_id: ticket.category_id?.toString() || "",
      });
    }
  }, [ticket, open, form]);

  const updateTicket = useMutation({
    mutationFn: async (values: z.infer<typeof ticketSchema>) => {
      const updates: any = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: values.status,
        category_id: values.category_id ? parseInt(values.category_id) : null,
      };

      if (values.status === "resolved" && ticket.status !== "resolved") {
        updates.resolved_at = new Date().toISOString();
      }
      if (values.status === "closed" && ticket.status !== "closed") {
        updates.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("helpdesk_tickets")
        .update(updates)
        .eq("id", ticket.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket updated successfully");
      queryClient.invalidateQueries({ queryKey: ["unified-requests"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-ticket", ticket.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-dashboard-stats"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to update ticket: " + error.message);
    },
  });

  const linkProblem = useMutation({
    mutationFn: async (problemId: string) => {
      const { error } = await supabase
        .from("helpdesk_problem_tickets")
        .insert({
          ticket_id: ticket.id,
          problem_id: parseInt(problemId),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Problem linked to ticket");
      setSelectedProblemId("");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problem-tickets", ticket.id] });
    },
    onError: (error: Error) => {
      toast.error("Failed to link problem: " + error.message);
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
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problem-tickets", ticket.id] });
    },
    onError: (error: Error) => {
      toast.error("Failed to unlink problem: " + error.message);
    },
  });

  const onSubmit = (values: z.infer<typeof ticketSchema>) => {
    updateTicket.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Ticket</DialogTitle>
          <DialogDescription>
            Update ticket information and status
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide detailed information..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                <h4 className="text-sm font-medium">Linked Problems ({linkedProblems?.length || 0})</h4>
              </div>

              {linkedProblems && linkedProblems.length > 0 && (
                <div className="space-y-2">
                  {linkedProblems.map((link: any) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-2 border rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {link.problem?.problem_number}
                        </Badge>
                        <span className="truncate">{link.problem?.title}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => unlinkProblem.mutate(link.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Select value={selectedProblemId} onValueChange={setSelectedProblemId}>
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
                  type="button"
                  size="sm"
                  onClick={() => selectedProblemId && linkProblem.mutate(selectedProblemId)}
                  disabled={!selectedProblemId || linkProblem.isPending}
                >
                  {linkProblem.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Link
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateTicket.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTicket.isPending}>
                {updateTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Ticket
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
