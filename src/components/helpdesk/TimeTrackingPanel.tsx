import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TimeTrackingPanelProps {
  ticketId: number;
}

export const TimeTrackingPanel = ({ ticketId }: TimeTrackingPanelProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(false);

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

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ["ticket-time-entries", ticketId],
    queryFn: async () => {
      // @ts-ignore - table exists after migration
      const { data, error } = await supabase
        .from("helpdesk_time_entries")
        .select("*, user:users(name, email)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const addTimeEntry = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Not logged in");
      
      const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
      if (totalMinutes <= 0) throw new Error("Please enter a valid time");

      // @ts-ignore - table exists after migration
      const { error } = await supabase
        .from("helpdesk_time_entries")
        .insert({
          ticket_id: ticketId,
          user_id: currentUser.id,
          minutes: totalMinutes,
          description: description || null,
          is_billable: isBillable,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Time entry added");
      queryClient.invalidateQueries({ queryKey: ["ticket-time-entries", ticketId] });
      setIsOpen(false);
      setHours("");
      setMinutes("");
      setDescription("");
      setIsBillable(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTimeEntry = useMutation({
    mutationFn: async (entryId: number) => {
      // @ts-ignore - table exists after migration
      const { error } = await supabase
        .from("helpdesk_time_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Time entry deleted");
      queryClient.invalidateQueries({ queryKey: ["ticket-time-entries", ticketId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const totalMinutes = timeEntries?.reduce((acc: number, entry: any) => acc + entry.minutes, 0) || 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Tracking
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Time</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="What did you work on?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="billable"
                    checked={isBillable}
                    onCheckedChange={(checked) => setIsBillable(checked as boolean)}
                  />
                  <Label htmlFor="billable" className="cursor-pointer">
                    Billable time
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => addTimeEntry.mutate()}
                    disabled={addTimeEntry.isPending}
                  >
                    {addTimeEntry.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Entry
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="mb-3 p-2 bg-muted rounded-lg text-center">
          <p className="text-xs text-muted-foreground">Total Time</p>
          <p className="text-lg font-semibold">
            {totalHours > 0 && `${totalHours}h `}{remainingMinutes}m
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : timeEntries && timeEntries.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {timeEntries.map((entry: any) => (
              <div 
                key={entry.id} 
                className="flex items-start justify-between p-2 border rounded-lg text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatTime(entry.minutes)}</span>
                    {entry.is_billable && (
                      <Badge variant="outline" className="text-xs">Billable</Badge>
                    )}
                  </div>
                  {entry.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {entry.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.user?.name || "Unknown"} • {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => deleteTimeEntry.mutate(entry.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            No time logged yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};