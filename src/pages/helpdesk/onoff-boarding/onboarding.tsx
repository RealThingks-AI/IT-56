import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Search, ChevronsUpDown, Check, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflows, useCreateWorkflow, useTemplates } from "@/hooks/onboarding/useOnboardingData";
import { useUsers } from "@/hooks/useUsers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { data: workflows = [], isLoading } = useWorkflows("onboarding");
  const { data: templates = [] } = useTemplates("onboarding");
  const { data: users = [] } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const createMut = useCreateWorkflow();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [form, setForm] = useState({ employeeName: "", email: "", department: "", templateId: "", startDate: "", userId: "" });
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const activeTemplates = templates.filter(t => t.is_active);
  const activeUsers = useMemo(() => users.filter(u => (u as any).status === "active"), [users]);

  const filtered = workflows.filter(w => {
    const matchSearch = !search || w.employee_name.toLowerCase().includes(search.toLowerCase()) || w.department.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSelectUser = (user: typeof activeUsers[0]) => {
    setForm(p => ({
      ...p,
      userId: user.id,
      employeeName: user.name || user.email,
      email: user.email,
      department: "",
    }));
    setUserPickerOpen(false);
    setManualEntry(false);
  };

  const handleCreate = () => {
    if (!form.employeeName) return;
    const selectedTemplate = templates.find(t => t.id === form.templateId);
    createMut.mutate({
      type: "onboarding",
      employee_name: form.employeeName,
      employee_email: form.email,
      department: form.department,
      template_id: form.templateId || null,
      user_id: form.userId || null,
      start_date: form.startDate || null,
      assigned_to: currentUser?.name || currentUser?.email || "",
      templateTasks: selectedTemplate?.default_tasks ?? [],
    }, {
      onSuccess: () => {
        // Send email notification (fire-and-forget)
        if (form.email) {
          supabase.functions.invoke("ob-notifications", {
            body: {
              recipientEmails: [form.email],
              type: "onboarding",
              employeeName: form.employeeName,
              department: form.department,
              startDate: form.startDate,
              assignedTo: currentUser?.name || "",
              templateName: selectedTemplate?.name || "",
            },
          }).catch(() => {});
        }
        setForm({ employeeName: "", email: "", department: "", templateId: "", startDate: "", userId: "" });
        setManualEntry(false);
        setDialogOpen(false);
      },
    });
  };

  if (isLoading) return <div className="p-3 space-y-2"><Skeleton className="h-8 w-60" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="w-[150px]">
            {["All", "active", "completed", "cancelled"].map(s => (
              <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" className="h-7 text-xs"><Plus className="h-3.5 w-3.5 mr-1" />New Onboarding</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Onboarding</DialogTitle>
              <DialogDescription>Set up a new onboarding workflow for an employee.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Employee</Label>
                {!manualEntry ? (
                  <div className="space-y-1.5">
                    <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                          {form.userId ? form.employeeName : "Select from directory..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search users..." />
                          <CommandList>
                            <CommandEmpty>No users found</CommandEmpty>
                            <CommandGroup>
                              {activeUsers.map(u => (
                                <CommandItem key={u.id} value={`${u.name || ""} ${u.email}`} onSelect={() => handleSelectUser(u)}>
                                  <Check className={cn("mr-2 h-4 w-4", form.userId === u.id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col">
                                    <span className="text-sm">{u.name || u.email}</span>
                                    {u.name && <span className="text-xs text-muted-foreground">{u.email}</span>}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => { setManualEntry(true); setForm(p => ({ ...p, userId: "" })); }}>
                      <UserPlus className="h-3 w-3 mr-1" />New hire not in directory
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Input placeholder="Employee name" value={form.employeeName} onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))} />
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setManualEntry(false)}>
                      ← Select from directory
                    </Button>
                  </div>
                )}
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
                <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Template</Label>
                <Select value={form.templateId || undefined} onValueChange={v => setForm(p => ({ ...p, templateId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                  <SelectContent>
                    {activeTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({Array.isArray(t.default_tasks) ? t.default_tasks.length : 0} tasks)</SelectItem>)}
                    {activeTemplates.length === 0 && <SelectItem value="_none" disabled>No templates — create one first</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createMut.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(w => (
                <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/onoff-boarding/workflow-detail/${w.id}`)}>
                  <TableCell className="font-medium py-1.5">{w.employee_name}</TableCell>
                  <TableCell className="py-1.5">{w.department || "—"}</TableCell>
                  <TableCell className="text-muted-foreground py-1.5">{w.template?.name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">{w.start_date || "—"}</TableCell>
                  <TableCell className="py-1.5"><Badge variant={w.status === "completed" ? "default" : w.status === "active" ? "secondary" : "outline"}>{w.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground py-1.5">{w.assigned_to}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No onboarding workflows</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
