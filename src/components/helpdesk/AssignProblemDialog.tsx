import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/hooks/useUsers";

interface AssignProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problem: any;
}

export function AssignProblemDialog({ open, onOpenChange, problem }: AssignProblemDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [assigneeId, setAssigneeId] = useState(problem?.assigned_to ?? "unassigned");

  // Use shared hook instead of custom query
  const { data: users } = useUsers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("helpdesk_problems")
        .update({
          assigned_to: assigneeId === "unassigned" ? null : assigneeId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", problem.id);

      if (error) throw error;

      toast.success("Problem assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problems"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to assign problem: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Assign Problem - {problem?.problem_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assignee">Assign To</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users?.map((u: any) => (
                  <SelectItem key={u.auth_user_id} value={u.auth_user_id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
