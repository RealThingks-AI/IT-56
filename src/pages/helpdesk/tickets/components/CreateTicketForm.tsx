import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category_id: z.string().min(1, "Please select a category"),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface CreateTicketFormProps {
  onSearchChange?: (query: string) => void;
}

export function CreateTicketForm({ onSearchChange }: CreateTicketFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      category_id: "",
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["helpdesk-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("id, organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!userData) throw new Error("User profile not found");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();

      const { data: orgFromFunction } = await supabase.rpc("get_user_org");

      return {
        id: userData.id,
        organisation_id: orgFromFunction || userData.organisation_id,
        tenant_id: profileData?.tenant_id,
        profileTenantId: profileData?.tenant_id,
      };
    },
  });

  const createTicket = useMutation({
    mutationFn: async (data: TicketFormData) => {
      if (!currentUser) throw new Error("User not found");

      // Use tenant_id if available, otherwise default to 1 for org users
      const tenantId = currentUser.profileTenantId || currentUser.tenant_id || 1;

      // Generate ticket number per-tenant (ignore organisation to avoid collisions across orgs)
      const { data: ticketNumber } = await supabase.rpc("generate_helpdesk_ticket_number", {
        p_tenant_id: tenantId,
        p_org_id: null as any,
      });

      // Insert ticket
      const { data: ticket, error } = await supabase
        .from("helpdesk_tickets")
        .insert({
          ticket_number: ticketNumber,
          title: data.title,
          description: data.description,
          priority: data.priority,
          category_id: parseInt(data.category_id),
          status: "open",
          requester_id: currentUser.id,
          tenant_id: tenantId,
          organisation_id: currentUser.organisation_id,
        })
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (ticket) => {
      toast.success("Ticket created successfully");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-dashboard-stats"] });
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create ticket: " + error.message);
    },
  });

  const onSubmit = (data: TicketFormData) => {
    createTicket.mutate(data);
  };

  // Watch title and description for KB suggestions
  const title = form.watch("title");
  const description = form.watch("description");

  // Debounced search for KB suggestions
  import("react").then(({ useEffect }) => {
    // Note: This is handled by the parent component now
  });
  
  // Notify parent of search changes
  const searchQuery = `${title} ${description}`.trim();
  if (onSearchChange && searchQuery.length > 3) {
    // Debounce handled by parent
    onSearchChange(searchQuery);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
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
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide detailed information about the issue"
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
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
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority *</FormLabel>
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
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/tickets")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createTicket.isPending}>
            {createTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Ticket
          </Button>
        </div>
      </form>
    </Form>
  );
}
