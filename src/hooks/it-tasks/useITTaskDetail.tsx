import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ITTaskComment {
  id: number;
  task_id: number;
  comment: string;
  user_name: string;
  user_id: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface ITTaskAttachment {
  id: number;
  task_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export function useITTaskComments(taskId: number | undefined) {
  return useQuery({
    queryKey: ["it-task-comments", taskId],
    queryFn: async (): Promise<ITTaskComment[]> => {
      const { data, error } = await supabase
        .from("it_task_comments")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ITTaskComment[];
    },
    enabled: !!taskId,
  });
}

export function useAddITTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      task_id: number;
      comment: string;
      user_name: string;
      user_id?: string;
      is_internal?: boolean;
      task_title?: string;
    }) => {
      const { error } = await supabase.from("it_task_comments").insert({
        task_id: input.task_id,
        comment: input.comment,
        user_name: input.user_name,
        user_id: input.user_id || null,
        is_internal: input.is_internal || false,
      });
      if (error) throw error;
      await supabase.from("it_task_activity").insert({
        task_id: input.task_id,
        task_title: input.task_title || "",
        action: input.is_internal ? "internal_note" : "comment_added",
        detail: input.comment.slice(0, 120),
        user_name: input.user_name,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["it-task-comments", vars.task_id] });
      qc.invalidateQueries({ queryKey: ["it-task-activity"] });
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });
}

export function useITTaskAttachments(taskId: number | undefined) {
  return useQuery({
    queryKey: ["it-task-attachments", taskId],
    queryFn: async (): Promise<ITTaskAttachment[]> => {
      const { data, error } = await supabase
        .from("it_task_attachments")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ITTaskAttachment[];
    },
    enabled: !!taskId,
  });
}

export function useUploadITTaskAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      task_id: number;
      file: File;
      uploaded_by: string;
      task_title?: string;
    }) => {
      const filePath = `${input.task_id}/${Date.now()}-${input.file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("it-task-attachments")
        .upload(filePath, input.file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("it-task-attachments")
        .getPublicUrl(filePath);

      const { error } = await supabase.from("it_task_attachments").insert({
        task_id: input.task_id,
        file_name: input.file.name,
        file_url: urlData.publicUrl,
        file_size: input.file.size,
        uploaded_by: input.uploaded_by,
      });
      if (error) throw error;

      await supabase.from("it_task_activity").insert({
        task_id: input.task_id,
        task_title: input.task_title || "",
        action: "attachment_added",
        detail: input.file.name,
        user_name: input.uploaded_by,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["it-task-attachments", vars.task_id] });
      qc.invalidateQueries({ queryKey: ["it-task-activity"] });
      toast.success("File uploaded");
    },
    onError: () => toast.error("Failed to upload file"),
  });
}

export function useDeleteITTaskAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      task_id: number;
      file_url: string;
      file_name: string;
      user_name: string;
      task_title?: string;
    }) => {
      const bucketUrl = "/it-task-attachments/";
      const idx = input.file_url.indexOf(bucketUrl);
      if (idx > -1) {
        const path = input.file_url.slice(idx + bucketUrl.length);
        await supabase.storage.from("it-task-attachments").remove([path]);
      }
      const { error } = await supabase
        .from("it_task_attachments")
        .delete()
        .eq("id", input.id);
      if (error) throw error;

      await supabase.from("it_task_activity").insert({
        task_id: input.task_id,
        task_title: input.task_title || "",
        action: "attachment_deleted",
        detail: input.file_name,
        user_name: input.user_name,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["it-task-attachments", vars.task_id] });
      qc.invalidateQueries({ queryKey: ["it-task-activity"] });
      toast.success("Attachment deleted");
    },
    onError: () => toast.error("Failed to delete attachment"),
  });
}
