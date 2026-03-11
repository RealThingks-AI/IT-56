import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BackButton } from "@/components/BackButton";
import { Plus, CheckCircle, XCircle, Trash2, Monitor, KeyRound, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useWorkflow, useUpdateWorkflow, useDeleteWorkflow, useWorkflowTasks, useCreateTask, useToggleTask, useDeleteTask,
  useUserAssets, useUserLicenses,
} from "@/hooks/onboarding/useOnboardingData";

export default function WorkflowDetail() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const { data: workflow, isLoading: wfLoading } = useWorkflow(workflowId);
  const { data: tasks = [], isLoading: tasksLoading } = useWorkflowTasks(workflowId);
  const updateWf = useUpdateWorkflow();
  const deleteWf = useDeleteWorkflow();
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();

  const userId = workflow?.user_id;
  const { data: userAssets = [], isLoading: assetsLoading } = useUserAssets(userId);
  const { data: userLicenses = [], isLoading: licensesLoading } = useUserLicenses(userId);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const completed = tasks.filter(t => t.is_completed).length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const isOffboarding = workflow?.type === "offboarding";
  const isOnboarding = workflow?.type === "onboarding";

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !workflowId) return;
    createTask.mutate({ workflow_id: workflowId, title: newTaskTitle.trim(), sort_order: total });
    setNewTaskTitle("");
  };

  const handleStatusChange = (status: "completed" | "cancelled") => {
    if (!workflowId) return;
    updateWf.mutate({ id: workflowId, status }, { onSuccess: () => toast.success(`Workflow ${status}`) });
  };

  const handleDelete = () => {
    if (!workflowId) return;
    deleteWf.mutate(workflowId, {
      onSuccess: () => navigate("/onoff-boarding/onboarding"),
    });
  };

  if (wfLoading || tasksLoading) return <div className="p-3 space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-48 w-full" /></div>;
  if (!workflow) return <div className="p-3"><BackButton /><p className="text-sm text-muted-foreground mt-2">Workflow not found.</p></div>;

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <BackButton />

      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-foreground">{workflow.employee_name}</h2>
        <Badge variant={workflow.type === "onboarding" ? "default" : "secondary"}>{workflow.type}</Badge>
        <Badge variant={workflow.status === "completed" ? "default" : workflow.status === "active" ? "secondary" : "outline"}>{workflow.status}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div><span className="text-muted-foreground">Department:</span> <span className="font-medium text-foreground">{workflow.department || "—"}</span></div>
        <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground">{workflow.employee_email || "—"}</span></div>
        <div><span className="text-muted-foreground">{isOnboarding ? "Start Date" : "Last Day"}:</span> <span className="font-medium text-foreground">{workflow.start_date || workflow.last_day || "—"}</span></div>
        <div><span className="text-muted-foreground">Assigned To:</span> <span className="font-medium text-foreground">{workflow.assigned_to}</span></div>
        {workflow.reason && <div><span className="text-muted-foreground">Reason:</span> <span className="font-medium text-foreground">{workflow.reason}</span></div>}
        {workflow.template?.name && <div><span className="text-muted-foreground">Template:</span> <span className="font-medium text-foreground">{workflow.template.name}</span></div>}
      </div>

      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-3 flex-1 max-w-md" />
        <span className="text-sm font-medium text-foreground">{progress}% ({completed}/{total})</span>
      </div>

      <div className="flex gap-2">
        {workflow.status === "active" && (
          <>
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleStatusChange("completed")} disabled={updateWf.isPending}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange("cancelled")} disabled={updateWf.isPending}>
              <XCircle className="h-3.5 w-3.5 mr-1" />Cancel
            </Button>
          </>
        )}
        {workflow.status !== "active" && (
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setDeleteConfirmOpen(true)} disabled={deleteWf.isPending}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete Workflow
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Workflow"
        description="This will permanently delete this workflow and all its tasks. This cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />

      {/* Tasks Card */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
          {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>}
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-2.5 py-1 border-b last:border-0">
              <Checkbox
                checked={t.is_completed}
                disabled={workflow.status !== "active"}
                onCheckedChange={checked => toggleTask.mutate({ id: t.id, is_completed: !!checked, workflow_id: t.workflow_id })}
              />
              <span className={`flex-1 text-sm ${t.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
              {t.due_date && <span className="text-[10px] text-muted-foreground">{t.due_date}</span>}
              {workflow.status === "active" && (
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => deleteTask.mutate({ id: t.id, workflow_id: t.workflow_id })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {workflow.status === "active" && (
            <div className="flex gap-1.5 pt-1">
              <Input placeholder="Add a task..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTask()} className="h-7 text-sm" />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAddTask} disabled={createTask.isPending}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Assets */}
      {userId && (
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              Assigned Assets
              {userAssets.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{userAssets.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-1.5">
            {assetsLoading && <Skeleton className="h-16 w-full" />}
            {!assetsLoading && userAssets.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">No assets currently assigned</p>
            )}
            {userAssets.map(a => (
              <div key={a.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                {isOffboarding && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.asset_tag} · {a.category_name}</div>
                </div>
                {isOffboarding && (
                  <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 shrink-0">
                    To Return
                  </Badge>
                )}
                {isOnboarding && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">Assigned</Badge>
                )}
              </div>
            ))}
            {isOnboarding && workflow.status === "active" && (
              <a href="/assets/checkout" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                <ExternalLink className="h-3 w-3" />Assign an asset
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assigned Licenses */}
      {userId && (
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Assigned Licenses
              {userLicenses.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{userLicenses.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-1.5">
            {licensesLoading && <Skeleton className="h-16 w-full" />}
            {!licensesLoading && userLicenses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">No licenses currently assigned</p>
            )}
            {userLicenses.map(l => (
              <div key={l.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                {isOffboarding && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{l.tool_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.license_key && <span>{l.license_key} · </span>}
                    {l.expires_at ? `Expires ${l.expires_at.slice(0, 10)}` : "No expiry"}
                  </div>
                </div>
                {isOffboarding && (
                  <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 shrink-0">
                    To Revoke
                  </Badge>
                )}
                {isOnboarding && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">Active</Badge>
                )}
              </div>
            ))}
            {isOnboarding && workflow.status === "active" && (
              <a href="/subscription/licenses" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                <ExternalLink className="h-3 w-3" />Assign a license
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* No user linked notice */}
      {!userId && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              This workflow is not linked to a user in the directory. Asset and license information is unavailable.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
