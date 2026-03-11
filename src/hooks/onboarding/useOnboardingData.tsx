import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────
export interface OBTemplate {
  id: string;
  name: string;
  type: "onboarding" | "offboarding";
  description: string;
  default_tasks: { title: string; description?: string }[];
  is_active: boolean;
  created_at: string;
}

export interface OBWorkflow {
  id: string;
  type: "onboarding" | "offboarding";
  employee_name: string;
  employee_email: string;
  department: string;
  template_id: string | null;
  user_id: string | null;
  start_date: string | null;
  last_day: string | null;
  status: "active" | "completed" | "cancelled";
  assigned_to: string;
  reason: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  template?: { id: string; name: string } | null;
  tasks?: OBWorkflowTask[];
}

export interface OBWorkflowTask {
  id: string;
  workflow_id: string;
  title: string;
  description: string;
  is_completed: boolean;
  assigned_to: string;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

// ─── Templates ───────────────────────────────────────────────────────
export function useTemplates(type?: "onboarding" | "offboarding") {
  return useQuery({
    queryKey: ["ob_templates", type],
    queryFn: async () => {
      let q = supabase.from("ob_templates").select("*").order("created_at", { ascending: false });
      if (type) q = q.eq("type", type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as OBTemplate[];
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<OBTemplate>) => {
      const payload = { ...t, is_active: t.is_active ?? true };
      const { error } = await supabase.from("ob_templates").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ob_templates"] }); toast.success("Template created"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<OBTemplate> & { id: string }) => {
      const { error } = await supabase.from("ob_templates").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ob_templates"] }); toast.success("Template updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ob_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ob_templates"] }); toast.success("Template deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Workflows ───────────────────────────────────────────────────────
export function useWorkflows(type?: "onboarding" | "offboarding") {
  return useQuery({
    queryKey: ["ob_workflows", type],
    queryFn: async () => {
      let q = supabase.from("ob_workflows").select("*, template:ob_templates(id, name)").order("created_at", { ascending: false });
      if (type) q = q.eq("type", type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as OBWorkflow[];
    },
  });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ["ob_workflow", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ob_workflows")
        .select("*, template:ob_templates(id, name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as OBWorkflow;
    },
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (w: Partial<OBWorkflow> & { templateTasks?: { title: string; description?: string }[] }) => {
      const { templateTasks, ...wf } = w;
      const { data, error } = await supabase.from("ob_workflows").insert(wf as any).select("id").single();
      if (error) throw error;
      if (templateTasks && templateTasks.length > 0 && data) {
        const tasks = templateTasks.map((t, i) => ({
          workflow_id: data.id,
          title: t.title,
          description: t.description || "",
          sort_order: i,
        }));
        await supabase.from("ob_workflow_tasks").insert(tasks as any);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ob_workflows"] });
      qc.invalidateQueries({ queryKey: ["ob_stats"] });
      toast.success("Workflow created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<OBWorkflow> & { id: string }) => {
      const { error } = await supabase.from("ob_workflows").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ob_workflows"] });
      qc.invalidateQueries({ queryKey: ["ob_workflow", v.id] });
      qc.invalidateQueries({ queryKey: ["ob_stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete tasks first
      await supabase.from("ob_workflow_tasks").delete().eq("workflow_id", id);
      const { error } = await supabase.from("ob_workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ob_workflows"] });
      qc.invalidateQueries({ queryKey: ["ob_stats"] });
      toast.success("Workflow deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Tasks ───────────────────────────────────────────────────────────
export function useWorkflowTasks(workflowId: string | undefined) {
  return useQuery({
    queryKey: ["ob_workflow_tasks", workflowId],
    enabled: !!workflowId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ob_workflow_tasks")
        .select("*")
        .eq("workflow_id", workflowId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as OBWorkflowTask[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<OBWorkflowTask>) => {
      const { error } = await supabase.from("ob_workflow_tasks").insert(t as any);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["ob_workflow_tasks", v.workflow_id] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_completed, workflow_id }: { id: string; is_completed: boolean; workflow_id: string }) => {
      const { error } = await supabase.from("ob_workflow_tasks").update({
        is_completed,
        completed_at: is_completed ? new Date().toISOString() : null,
      } as any).eq("id", id);
      if (error) throw error;
      return workflow_id;
    },
    onSuccess: (wfId) => { qc.invalidateQueries({ queryKey: ["ob_workflow_tasks", wfId] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workflow_id }: { id: string; workflow_id: string }) => {
      const { error } = await supabase.from("ob_workflow_tasks").delete().eq("id", id);
      if (error) throw error;
      return workflow_id;
    },
    onSuccess: (wfId) => { qc.invalidateQueries({ queryKey: ["ob_workflow_tasks", wfId] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── User Assets & Licenses ─────────────────────────────────────────
export interface UserAsset {
  id: string;
  name: string;
  asset_tag: string;
  category_name: string;
  status: string;
}

export function useUserAssets(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["ob_user_assets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: userRecord } = await supabase
        .from("users")
        .select("id, auth_user_id")
        .eq("id", userId!)
        .single();

      if (!userRecord) return [];

      const ids = [userRecord.id, userRecord.auth_user_id].filter(Boolean) as string[];

      const { data, error } = await supabase
        .from("itam_assets")
        .select("id, name, asset_tag, status, category:itam_categories(name)")
        .in("checked_out_to", ids)
        .eq("status", "in_use");

      if (error) throw error;

      return (data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name || "Unknown",
        asset_tag: a.asset_tag || "",
        category_name: (a.category as any)?.name || "",
        status: a.status || "",
      })) as UserAsset[];
    },
  });
}

export interface UserLicense {
  id: string;
  tool_id: string;
  tool_name: string;
  license_key: string;
  status: string;
  assigned_at: string;
  expires_at: string | null;
}

export function useUserLicenses(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["ob_user_licenses", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: userRecord } = await supabase
        .from("users")
        .select("id, auth_user_id")
        .eq("id", userId!)
        .single();

      if (!userRecord) return [];

      const ids = [userRecord.id, userRecord.auth_user_id].filter(Boolean) as string[];

      const { data, error } = await supabase
        .from("subscriptions_licenses")
        .select("id, tool_id, license_key, status, assigned_at, expires_at, tool:subscriptions_tools(id, tool_name)")
        .in("assigned_to", ids)
        .eq("status", "assigned");

      if (error) throw error;

      return (data ?? []).map((l: any) => ({
        id: l.id,
        tool_id: l.tool_id,
        tool_name: l.tool?.tool_name || "Unknown",
        license_key: l.license_key || "",
        status: l.status,
        assigned_at: l.assigned_at,
        expires_at: l.expires_at,
      })) as UserLicense[];
    },
  });
}

// ─── Dashboard stats ─────────────────────────────────────────────────
export function useOBStats() {
  return useQuery({
    queryKey: ["ob_stats"],
    queryFn: async () => {
      const { data: workflows, error } = await supabase.from("ob_workflows").select("id, type, status, created_at, updated_at, start_date, last_day, employee_name, department");
      if (error) throw error;
      const all = workflows ?? [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      return {
        activeOnboarding: all.filter(w => w.type === "onboarding" && w.status === "active").length,
        activeOffboarding: all.filter(w => w.type === "offboarding" && w.status === "active").length,
        completedThisMonth: all.filter(w => w.status === "completed" && w.updated_at >= monthStart).length,
        overdueTasks: 0,
        recentWorkflows: all.slice(0, 5),
        upcomingWorkflows: all.filter(w => w.status === "active" && ((w.start_date && w.start_date >= now.toISOString().slice(0, 10)) || (w.last_day && w.last_day >= now.toISOString().slice(0, 10)))).slice(0, 5),
        allWorkflows: all,
      };
    },
  });
}
