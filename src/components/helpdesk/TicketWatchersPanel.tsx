import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserDisplayName, getUserInitials } from "@/lib/userUtils";

interface TicketWatchersPanelProps {
  ticketId: number;
  organisationId?: string;
}

export const TicketWatchersPanel = ({ ticketId, organisationId }: TicketWatchersPanelProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
      return data;
    },
  });

  const { data: watchers, isLoading } = useQuery({
    queryKey: ["ticket-watchers", ticketId],
    queryFn: async () => {
      // @ts-ignore - table exists after migration
      const { data, error } = await supabase
        .from("helpdesk_ticket_watchers")
        .select("*, user:users(id, name, email)")
        .eq("ticket_id", ticketId);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: orgUsers } = useQuery({
    queryKey: ["org-users", organisationId],
    queryFn: async () => {
      if (!organisationId) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organisationId,
  });

  const isWatching = watchers?.some((w: any) => w.user_id === currentUser?.id);

  const addWatcher = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentUser) throw new Error("Not logged in");

      // @ts-ignore - table exists after migration
      const { error } = await supabase
        .from("helpdesk_ticket_watchers")
        .insert({
          ticket_id: ticketId,
          user_id: userId,
          added_by: currentUser.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Watcher added");
      queryClient.invalidateQueries({ queryKey: ["ticket-watchers", ticketId] });
      setIsOpen(false);
      setSelectedUserId("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeWatcher = useMutation({
    mutationFn: async (watcherId: number) => {
      // @ts-ignore - table exists after migration
      const { error } = await supabase
        .from("helpdesk_ticket_watchers")
        .delete()
        .eq("id", watcherId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Watcher removed");
      queryClient.invalidateQueries({ queryKey: ["ticket-watchers", ticketId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleWatch = () => {
    if (!currentUser) return;
    
    if (isWatching) {
      const watchEntry = watchers?.find((w: any) => w.user_id === currentUser.id);
      if (watchEntry) {
        removeWatcher.mutate(watchEntry.id);
      }
    } else {
      addWatcher.mutate(currentUser.id);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    return getUserInitials({ name, email });
  };

  const availableUsers = orgUsers?.filter(
    (user) => !watchers?.some((w: any) => w.user_id === user.id)
  );

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Watchers ({watchers?.length || 0})
          </CardTitle>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant={isWatching ? "secondary" : "outline"} 
              className="h-7"
              onClick={toggleWatch}
            >
              {isWatching ? "Watching" : "Watch"}
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Watcher</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {getUserDisplayName(user) || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => selectedUserId && addWatcher.mutate(selectedUserId)}
                      disabled={!selectedUserId || addWatcher.isPending}
                    >
                      {addWatcher.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : watchers && watchers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {watchers.map((watcher: any) => (
              <div 
                key={watcher.id} 
                className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-full text-sm"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">
                    {getUserInitials(watcher.user)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{getUserDisplayName(watcher.user) || "Unknown"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeWatcher.mutate(watcher.id)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            No watchers yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};