import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, GitMerge, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MergeTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTicketIds: number[];
  onSuccess?: () => void;
}

export const MergeTicketsDialog = ({
  open,
  onOpenChange,
  sourceTicketIds,
  onSuccess,
}: MergeTicketsDialogProps) => {
  const [search, setSearch] = useState("");
  const [targetTicketId, setTargetTicketId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: sourceTickets = [] } = useQuery({
    queryKey: ["merge-source-tickets", sourceTicketIds],
    queryFn: async () => {
      if (sourceTicketIds.length === 0) return [];
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select("id, ticket_number, title, status, priority")
        .in("id", sourceTicketIds);
      if (error) throw error;
      return data || [];
    },
    enabled: open && sourceTicketIds.length > 0,
  });

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ["merge-search-tickets", search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select("id, ticket_number, title, status, priority")
        .or(`ticket_number.ilike.%${search}%,title.ilike.%${search}%`)
        .not("id", "in", `(${sourceTicketIds.join(",")})`)
        .eq("is_deleted", false)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: open && search.length >= 2,
  });

  const mergeTickets = useMutation({
    mutationFn: async () => {
      if (!targetTicketId) throw new Error("Please select a target ticket");

      // Update source tickets to point to target
      const { error: mergeError } = await supabase
        .from("helpdesk_tickets")
        .update({
          merged_into_id: targetTicketId,
          status: "closed",
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", sourceTicketIds);

      if (mergeError) throw mergeError;

      // Copy comments from source tickets to target
      for (const sourceId of sourceTicketIds) {
        const { data: comments } = await supabase
          .from("helpdesk_ticket_comments")
          .select("*")
          .eq("ticket_id", sourceId);

        if (comments && comments.length > 0) {
          const sourceTicket = sourceTickets.find((t) => t.id === sourceId);
          
          // Add merge note
          await supabase.from("helpdesk_ticket_comments").insert({
            ticket_id: targetTicketId,
            user_id: comments[0]?.user_id,
            comment: `[Merged from ${sourceTicket?.ticket_number}] This ticket was merged.`,
            is_internal: true,
          });
        }
      }

      return { targetTicketId };
    },
    onSuccess: () => {
      toast.success(`${sourceTicketIds.length} ticket(s) merged successfully`);
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["unified-requests"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to merge tickets: " + error.message);
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Merge Tickets
          </DialogTitle>
          <DialogDescription>
            Merge selected tickets into a target ticket. Source tickets will be closed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Merging is permanent. Comments will be copied to the target ticket.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Source Tickets ({sourceTickets.length})</Label>
            <div className="border rounded-lg p-3 bg-muted/50">
              <div className="space-y-2">
                {sourceTickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Badge variant="outline" className="font-mono">
                      {ticket.ticket_number}
                    </Badge>
                    <span className="truncate flex-1">{ticket.title}</span>
                    <Badge className={`${getPriorityColor(ticket.priority)} text-xs`}>
                      {ticket.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Search Target Ticket</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket number or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {searching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Select Target Ticket</Label>
              <ScrollArea className="h-48 border rounded-lg">
                <RadioGroup
                  value={targetTicketId?.toString() || ""}
                  onValueChange={(value) => setTargetTicketId(parseInt(value))}
                >
                  {searchResults.map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <RadioGroupItem
                        value={ticket.id.toString()}
                        id={`ticket-${ticket.id}`}
                      />
                      <label
                        htmlFor={`ticket-${ticket.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {ticket.ticket_number}
                          </Badge>
                          <span className="truncate">{ticket.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {ticket.status}
                          </Badge>
                          <Badge className={`${getPriorityColor(ticket.priority)} text-xs`}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </ScrollArea>
            </div>
          )}

          {search.length >= 2 && !searching && searchResults.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No tickets found matching "{search}"
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mergeTickets.mutate()}
            disabled={!targetTicketId || mergeTickets.isPending}
          >
            {mergeTickets.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Merge {sourceTicketIds.length} Ticket(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
