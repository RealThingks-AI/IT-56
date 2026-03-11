import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Search, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useITTasks, useCreateITTask, useUpdateITTask, useDeleteITTask, useChangeITTaskStatus, type ITTask, type TaskStatus, type TaskPriority } from "@/hooks/it-tasks/useITTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const priorityColor: Record<string, string> = { critical: "destructive", high: "default", medium: "secondary", low: "outline" };
const statusLabel: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done" };
const statusOptions: TaskStatus[] = ["todo", "in_progress", "review", "done"];

const isOverdue = (d: string | null, s: string) => d && s !== "done" && new Date(d) < new Date(new Date().toDateString());

export default function AllTasks() {
  const { data: tasks = [], isLoading } = useITTasks();
  const createTask = useCreateITTask();
  const updateTask = useUpdateITTask();
  const deleteTask = useDeleteITTask();
  const changeStatus = useChangeITTaskStatus();
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<ITTask | null>(null);
  const [deleteId, setDeleteId] = useState<{ id: number; title: string } | null>(null);
  const [form, setForm] = useState({ title: "", assignee: "", priority: "medium", category: "Other", dueDate: "", description: "" });

  const categories = useMemo(() => [...new Set(tasks.map(t => t.category))], [tasks]);

  const filtered = useMemo(() => tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  }), [tasks, search, statusFilter, priorityFilter, categoryFilter]);

  const openCreate = () => {
    setEditTask(null);
    setForm({ title: "", assignee: "", priority: "medium", category: "Other", dueDate: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (t: ITTask) => {
    setEditTask(t);
    setForm({ title: t.title, assignee: t.assignee, priority: t.priority, category: t.category, dueDate: t.due_date || "", description: t.description || "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    const userName = currentUser?.name || "";
    if (editTask) {
      updateTask.mutate({ id: editTask.id, title: form.title, description: form.description, assignee: form.assignee, priority: form.priority as TaskPriority, category: form.category, due_date: form.dueDate || null, userName });
    } else {
      createTask.mutate({ title: form.title, description: form.description, assignee: form.assignee, priority: form.priority as TaskPriority, category: form.category, due_date: form.dueDate || undefined, created_by: currentUser?.id, userName });
    }
    setDialogOpen(false);
  };

  const handleStatusChange = (t: ITTask, newStatus: TaskStatus) => {
    changeStatus.mutate({ id: t.id, status: newStatus, oldStatus: t.status, taskTitle: t.title, userName: currentUser?.name || "" });
  };

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-7 text-xs" onClick={openCreate}><Plus className="h-3.5 w-3.5 mr-1" />Create Task</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTask ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assignee</Label><Input value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Deployment">Deployment</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={createTask.isPending || updateTask.isPending}>
              {editTask ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteId?.title}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteId) deleteTask.mutate({ id: deleteId.id, taskTitle: deleteId.title, userName: currentUser?.name || "" });
          setDeleteId(null);
        }}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              )}
              {!isLoading && filtered.map(t => (
                <TableRow key={t.id} className={isOverdue(t.due_date, t.status) ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium py-1.5">
                    <div className="flex items-center gap-1">
                      <button className="hover:underline text-left text-primary" onClick={() => navigate(`/it-tasks/${t.id}`)}>{t.title}</button>
                      {isOverdue(t.due_date, t.status) && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">{t.assignee}</TableCell>
                  <TableCell className="py-1.5"><Badge variant={priorityColor[t.priority] as any}>{t.priority}</Badge></TableCell>
                  <TableCell className="py-1.5">
                    <Select value={t.status} onValueChange={v => handleStatusChange(t, v as TaskStatus)}>
                      <SelectTrigger className="w-[110px] h-6 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground py-1.5">{t.category}</TableCell>
                  <TableCell className={`py-1.5 ${isOverdue(t.due_date, t.status) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {t.due_date || "—"}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId({ id: t.id, title: t.title })}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No tasks found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
