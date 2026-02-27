import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wrench, Plus, Calendar, CheckCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface MaintenanceTabProps {
  assetId: string;
}

interface MaintenanceSchedule {
  id: string;
  title: string;
  description: string | null;
  frequency: string | null;
  schedule_type: string | null;
  next_due_date: string | null;
  last_completed_date: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export const MaintenanceTab = ({ assetId }: MaintenanceTabProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    frequency: "monthly",
    next_due_date: "",
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["asset-maintenance", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_maintenance_schedules")
        .select("*")
        .eq("asset_id", assetId)
        .order("next_due_date", { ascending: true });
      
      if (error) throw error;
      return data as MaintenanceSchedule[];
    },
    enabled: !!assetId,
  });

  const createSchedule = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("itam_maintenance_schedules")
        .insert({
          asset_id: assetId,
          title: data.title,
          description: data.description || null,
          frequency: data.frequency,
          next_due_date: data.next_due_date || null,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance", assetId] });
      toast.success("Maintenance schedule created");
      setDialogOpen(false);
      setFormData({ title: "", description: "", frequency: "monthly", next_due_date: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create schedule");
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from("itam_maintenance_schedules")
        .delete()
        .eq("id", scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance", assetId] });
      toast.success("Maintenance schedule deleted");
    },
    onError: () => {
      toast.error("Failed to delete schedule");
    },
  });

  const markComplete = useMutation({
    mutationFn: async (schedule: MaintenanceSchedule) => {
      const now = new Date();
      let nextDue: Date | null = null;

      // Calculate next due date based on frequency
      if (schedule.frequency) {
        nextDue = new Date(now);
        switch (schedule.frequency) {
          case "daily":
            nextDue.setDate(nextDue.getDate() + 1);
            break;
          case "weekly":
            nextDue.setDate(nextDue.getDate() + 7);
            break;
          case "monthly":
            nextDue.setMonth(nextDue.getMonth() + 1);
            break;
          case "quarterly":
            nextDue.setMonth(nextDue.getMonth() + 3);
            break;
          case "yearly":
            nextDue.setFullYear(nextDue.getFullYear() + 1);
            break;
        }
      }

      const { error } = await supabase
        .from("itam_maintenance_schedules")
        .update({
          last_completed_date: now.toISOString(),
          next_due_date: nextDue?.toISOString() || null,
        })
        .eq("id", schedule.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance", assetId] });
      toast.success("Maintenance marked as complete");
    },
  });

  const getStatusBadge = (schedule: MaintenanceSchedule) => {
    if (!schedule.next_due_date) {
      return <Badge variant="outline">No schedule</Badge>;
    }
    
    const dueDate = new Date(schedule.next_due_date);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Due Soon</Badge>;
    }
    return <Badge variant="secondary">Scheduled</Badge>;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }
    createSchedule.mutate(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Maintenance Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Maintenance Schedule</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Annual Inspection"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="one_time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_due_date">Next Due Date</Label>
                  <Input
                    id="next_due_date"
                    type="date"
                    value={formData.next_due_date}
                    onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Maintenance details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSchedule.isPending}>
                    {createSchedule.isPending ? "Creating..." : "Create Schedule"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {schedules.length === 0 ? (
            <div className="text-center py-6">
              <Wrench className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No maintenance schedules</p>
              <p className="text-xs text-muted-foreground mt-1">Set up recurring maintenance tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Wrench className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{schedule.title}</span>
                      {getStatusBadge(schedule)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {schedule.frequency && (
                        <span className="capitalize">{schedule.frequency.replace(/_/g, " ")}</span>
                      )}
                      {schedule.next_due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {format(new Date(schedule.next_due_date), "dd MMM yyyy")}
                        </span>
                      )}
                    </div>
                    {schedule.description && (
                      <p className="text-xs text-muted-foreground mt-1">{schedule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {schedule.last_completed_date && (
                      <span className="text-[10px] text-muted-foreground mr-1">
                        Last: {format(new Date(schedule.last_completed_date), "dd MMM")}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => markComplete.mutate(schedule)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteSchedule.mutate(schedule.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};