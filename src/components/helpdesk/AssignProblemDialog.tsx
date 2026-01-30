import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface AssignProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problem: any;
}

export function AssignProblemDialog({ open, onOpenChange, problem }: AssignProblemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [assigneeId, setAssigneeId] = useState(problem?.assigned_to ?? "unassigned");

  const { data: users } = useQuery({
    queryKey: ["org-users"],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!userData?.organisation_id) return [];

      const { data, error } = await supabase
        .from("users")
        .select("id, auth_user_id, name, email")
        .eq("organisation_id", userData.organisation_id)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

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

      toast({
        title: "Success",
        description: "Problem assigned successfully",
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
      <DialogContent>
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
