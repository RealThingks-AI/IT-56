import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const problemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  category_id: z.string().optional(),
  linked_ticket_id: z.string().optional(),
  root_cause: z.string().optional(),
  workaround: z.string().optional(),
});

type ProblemFormData = z.infer<typeof problemSchema>;

interface CreateProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateProblemDialog = ({
  open,
  onOpenChange,
}: CreateProblemDialogProps) => {
  const queryClient = useQueryClient();

  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userRecord } = await supabase
        .from("users")
        .select("id, organisation_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();

      let organisationId = userRecord?.organisation_id || null;

      if (!organisationId) {
        const { data: orgId } = await supabase.rpc("get_user_org");
        if (orgId) {
          organisationId = orgId as string;
        }
      }

      return {
        authUserId: user.id,
        userId: userRecord?.id,
        organisationId,
        tenantId: profileData?.tenant_id || 1,
      };
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["helpdesk-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: availableTickets = [] } = useQuery({
    queryKey: ["helpdesk-tickets-for-link", userData?.organisationId],
    queryFn: async () => {
      if (!userData?.organisationId) return [];
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select("id, ticket_number, title, status, priority")
        .eq("organisation_id", userData.organisationId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userData?.organisationId && open,
  });

  const form = useForm<ProblemFormData>({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      root_cause: "",
      workaround: "",
      linked_ticket_id: "",
    },
  });

  const createProblem = useMutation({
    mutationFn: async (data: ProblemFormData) => {
      if (!userData?.organisationId) {
        throw new Error("User organisation not configured");
      }

      const tenantId = userData.tenantId || 1;

      const { data: problemNumber, error: numberError } = await supabase.rpc(
        "generate_problem_number",
        {
          p_tenant_id: tenantId,
          p_org_id: userData.organisationId,
        }
      );

      if (numberError) throw numberError;

      const { data: problemRow, error } = await supabase
        .from("helpdesk_problems")
        .insert({
          problem_number: problemNumber,
          title: data.title,
          description: data.description,
          priority: data.priority,
          category_id: data.category_id ? parseInt(data.category_id) : null,
          root_cause: data.root_cause || null,
          workaround: data.workaround || null,
          status: "open",
          created_by: userData.authUserId,
          organisation_id: userData.organisationId,
          tenant_id: tenantId,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (data.linked_ticket_id && problemRow?.id) {
        const { error: linkError } = await supabase
          .from("helpdesk_problem_tickets")
          .insert({
            problem_id: problemRow.id,
            ticket_id: parseInt(data.linked_ticket_id),
          });
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      toast.success("Problem created successfully");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problems"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create problem: " + error.message);
    },
  });

  const onSubmit = (data: ProblemFormData) => {
    createProblem.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Problem</DialogTitle>
          <DialogDescription>
            Document a recurring issue or root cause that affects multiple tickets.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief problem title" {...field} />
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
                      placeholder="Detailed description of the problem"
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
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
            </div>

            <FormField
              control={form.control}
              name="linked_ticket_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link Ticket (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ticket to link" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTickets.map((ticket: any) => (
                        <SelectItem key={ticket.id} value={ticket.id.toString()}>
                          {ticket.ticket_number} - {ticket.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="root_cause"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Root Cause (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Identified root cause of the problem"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workaround"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workaround (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Temporary workaround or mitigation steps"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createProblem.isPending || !userData || isLoadingUser}>
                {createProblem.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Problem
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
