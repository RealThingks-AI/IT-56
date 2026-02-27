import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getUserDisplayName } from "@/lib/userUtils";
import { useUsers } from "@/hooks/useUsers";

const assignSchema = z.object({
  assignee_id: z.string().min(1, "Please select an assignee"),
});

interface AssignTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: any;
}

export const AssignTicketDialog = ({ open, onOpenChange, ticket }: AssignTicketDialogProps) => {
  const queryClient = useQueryClient();

  // Use shared hook instead of custom query
  const { data: users = [] } = useUsers();

  const form = useForm<z.infer<typeof assignSchema>>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      assignee_id: ticket?.assignee_id || "",
    },
  });

  const assignTicket = useMutation({
    mutationFn: async (values: z.infer<typeof assignSchema>) => {
      const { error } = await supabase
        .from("helpdesk_tickets")
        .update({ assignee_id: values.assignee_id })
        .eq("id", ticket.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["unified-requests"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-ticket", ticket.id.toString()] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to assign ticket: " + error.message);
    },
  });

  const onSubmit = (values: z.infer<typeof assignSchema>) => {
    assignTicket.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Assign Ticket</DialogTitle>
          <DialogDescription>
            Assign this ticket to a team member
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assignee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {getUserDisplayName(user) || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={assignTicket.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assignTicket.isPending}>
                {assignTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
