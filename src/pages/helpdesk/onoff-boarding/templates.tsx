import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, type OBTemplate } from "@/hooks/onboarding/useOnboardingData";

export default function TemplatesPage() {
  const { data: templates = [], isLoading } = useTemplates();
  const createMut = useCreateTemplate();
  const updateMut = useUpdateTemplate();
  const deleteMut = useDeleteTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "onboarding" as "onboarding" | "offboarding", description: "" });
  const [tasks, setTasks] = useState<{ title: string; description?: string }[]>([]);
  const [newTask, setNewTask] = useState("");

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", type: "onboarding", description: "" });
    setTasks([]);
    setDialogOpen(true);
  };

  const openEdit = (t: OBTemplate) => {
    setEditingId(t.id);
    setForm({ name: t.name, type: t.type, description: t.description });
    setTasks(Array.isArray(t.default_tasks) ? t.default_tasks : []);
    setDialogOpen(true);
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(p => [...p, { title: newTask.trim() }]);
    setNewTask("");
  };

  const handleSave = () => {
    if (!form.name) return;
    const payload = { ...form, default_tasks: tasks };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) { deleteMut.mutate(deleteId); setDeleteId(null); }
  };

  const toggleActive = (t: OBTemplate) => {
    updateMut.mutate({ id: t.id, is_active: !t.is_active });
  };

  if (isLoading) return <div className="p-3 space-y-2"><Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={openCreate}><Plus className="h-3.5 w-3.5 mr-1" />Create Template</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>Define the template name, type, and default tasks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="offboarding">Offboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div>
              <Label>Default Tasks</Label>
              <div className="space-y-1.5 mt-1">
                {tasks.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded px-2 py-1 text-sm">
                    <span className="flex-1">{t.title}</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setTasks(p => p.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Input placeholder="Add task..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTask())} className="h-7 text-sm" />
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addTask}>Add</Button>
                </div>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={createMut.isPending || updateMut.isPending}>
              {editingId ? "Save Changes" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null); }} title="Delete Template" description="Are you sure? This cannot be undone." onConfirm={handleDelete} confirmText="Delete" variant="destructive" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium py-1.5">{t.name}</TableCell>
                  <TableCell className="py-1.5"><Badge variant={t.type === "onboarding" ? "default" : "secondary"}>{t.type}</Badge></TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate py-1.5">{t.description}</TableCell>
                  <TableCell className="py-1.5">{Array.isArray(t.default_tasks) ? t.default_tasks.length : 0}</TableCell>
                  <TableCell className="py-1.5"><Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} /></TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No templates created</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
