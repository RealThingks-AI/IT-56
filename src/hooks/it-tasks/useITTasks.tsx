import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface ITTask {
  id: number;
  title: string;
  description: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ITTaskActivity {
  id: number;
  task_id: number | null;
  task_title: string;
  action: string;
  detail: string;
  user_name: string;
  created_at: string;
}

const TASKS_KEY = ["it-tasks"];
const ACTIVITY_KEY = ["it-task-activity"];

export function useITTasks() {
  return useQuery({
    queryKey: TASKS_KEY,
    queryFn: async (): Promise<ITTask[]> => {
      const { data, error } = await supabase
        .from("it_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ITTask[];
    },
    staleTime: 30_000,
  });
}

export function useITTaskActivity() {
  return useQuery({
    queryKey: ACTIVITY_KEY,
    queryFn: async (): Promise<ITTaskActivity[]> => {
      const { data, error } = await supabase
        .from("it_task_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as ITTaskActivity[];
    },
    staleTime: 30_000,
  });
}

async function logActivity(
  taskId: number | null,
  taskTitle: string,
  action: string,
  detail: string,
  userName: string
) {
  await supabase.from("it_task_activity").insert({
    task_id: taskId,
    task_title: taskTitle,
    action,
    detail,
    user_name: userName,
  });
}

export function useCreateITTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      assignee?: string;
      priority?: TaskPriority;
      category?: string;
      due_date?: string;
      created_by?: string;
      userName?: string;
    }) => {
      const { data, error } = await supabase
        .from("it_tasks")
        .insert({
          title: input.title,
          description: input.description || "",
          assignee: input.assignee || "",
          priority: input.priority || "medium",
          category: input.category || "Other",
          due_date: input.due_date || null,
          created_by: input.created_by || null,
        })
        .select()
        .single();
      if (error) throw error;
      await logActivity(data.id, input.title, "created", "Task created", input.userName || "");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: ACTIVITY_KEY });
      toast.success("Task created");
    },
    onError: () => toast.error("Failed to create task"),
  });
}

export function useUpdateITTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      title?: string;
      description?: string;
      assignee?: string;
      priority?: TaskPriority;
      category?: string;
      due_date?: string | null;
      userName?: string;
    }) => {
      const { userName, id, ...fields } = input;
      const { data, error } = await supabase
        .from("it_tasks")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      const changes = Object.keys(fields).join(", ");
      await logActivity(id, data.title, "updated", `Updated: ${changes}`, userName || "");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: ACTIVITY_KEY });
      toast.success("Task updated");
    },
    onError: () => toast.error("Failed to update task"),
  });
}

export function useChangeITTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; status: TaskStatus; oldStatus: string; taskTitle: string; userName?: string }) => {
      const { error } = await supabase
        .from("it_tasks")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
      await logActivity(
        input.id,
        input.taskTitle,
        "status_changed",
        `${input.oldStatus} → ${input.status}`,
        input.userName || ""
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: ACTIVITY_KEY });
    },
  });
}

export function useDeleteITTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; taskTitle: string; userName?: string }) => {
      const { error } = await supabase
        .from("it_tasks")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
      await logActivity(null, input.taskTitle, "deleted", "Task deleted", input.userName || "");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      qc.invalidateQueries({ queryKey: ACTIVITY_KEY });
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });
}
