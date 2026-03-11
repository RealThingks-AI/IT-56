import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Search, UserMinus, Package, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useWorkflows, useCreateWorkflow, useTemplates, useUserAssets, useUserLicenses } from "@/hooks/onboarding/useOnboardingData";
import { useUsers, type AppUser } from "@/hooks/useUsers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";

export default function OffboardingPage() {
  const navigate = useNavigate();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: workflows = [], isLoading: wfLoading } = useWorkflows("offboarding");
  const { data: templates = [] } = useTemplates("offboarding");
  const { data: currentUser } = useCurrentUser();
  const createMut = useCreateWorkflow();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState({ department: "", lastDay: "", templateId: "", reason: "" });

  const activeUsers = useMemo(() => users.filter(u => u.status === "active"), [users]);

  const filtered = activeUsers.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.name?.toLowerCase().includes(s)) || u.email.toLowerCase().includes(s) || (u.role?.toLowerCase().includes(s));
  });

  const userActiveWorkflow = useMemo(() => {
    if (!selectedUser) return null;
    return workflows.find(w => w.user_id === selectedUser.id && w.status === "active") || null;
  }, [selectedUser, workflows]);

  const handleUserClick = (user: AppUser) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  const handleInitiateOffboarding = () => {
    setForm({ department: "", lastDay: "", templateId: "", reason: "" });
    setCreateDialogOpen(true);
  };

  const activeTemplates = templates.filter(t => t.is_active);

  const handleCreate = () => {
    if (!selectedUser) return;
    const selectedTemplate = templates.find(t => t.id === form.templateId);
    createMut.mutate({
      type: "offboarding",
      employee_name: selectedUser.name || selectedUser.email,
      employee_email: selectedUser.email,
      department: form.department,
      last_day: form.lastDay || null,
      template_id: form.templateId || null,
      user_id: selectedUser.id,
      reason: form.reason,
      assigned_to: currentUser?.name || currentUser?.email || "",
      templateTasks: selectedTemplate?.default_tasks ?? [],
    }, {
      onSuccess: () => {
        if (selectedUser.email) {
          supabase.functions.invoke("ob-notifications", {
            body: {
              recipientEmails: [selectedUser.email],
              type: "offboarding",
              employeeName: selectedUser.name || selectedUser.email,
              department: form.department,
              lastDay: form.lastDay,
              assignedTo: currentUser?.name || "",
              templateName: selectedTemplate?.name || "",
            },
          }).catch(() => {});
        }
        setCreateDialogOpen(false);
      },
    });
  };

  const isLoading = usersLoading || wfLoading;

  if (isLoading) return <div className="p-3 space-y-2"><Skeleton className="h-8 w-60" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <Tabs defaultValue="directory" className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="h-7">
            <TabsTrigger value="directory" className="text-xs h-6">User Directory</TabsTrigger>
            <TabsTrigger value="workflows" className="text-xs h-6">Workflows ({workflows.length})</TabsTrigger>
          </TabsList>
          <div className="relative w-[220px]">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-sm" />
          </div>
        </div>

        <TabsContent value="directory" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Offboarding Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => {
                    const hasActiveWf = workflows.some(w => w.user_id === u.id && w.status === "active");
                    return (
                      <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleUserClick(u)}>
                        <TableCell className="font-medium py-1.5">{u.name || "—"}</TableCell>
                        <TableCell className="py-1.5 text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="py-1.5 text-muted-foreground capitalize">{u.role || "—"}</TableCell>
                        <TableCell className="py-1.5">
                          {hasActiveWf ? (
                            <Badge variant="secondary">In Progress</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No active users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Last Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map(w => (
                    <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/onoff-boarding/workflow-detail/${w.id}`)}>
                      <TableCell className="font-medium py-1.5">{w.employee_name}</TableCell>
                      <TableCell className="py-1.5">{w.reason || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-1.5">{w.last_day || "—"}</TableCell>
                      <TableCell className="py-1.5"><Badge variant={w.status === "completed" ? "default" : w.status === "active" ? "secondary" : "outline"}>{w.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground py-1.5">{w.assigned_to}</TableCell>
                    </TableRow>
                  ))}
                  {workflows.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No offboarding workflows</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedUser && (
            <UserDetailSheet
              user={selectedUser}
              activeWorkflow={userActiveWorkflow}
              onInitiateOffboarding={handleInitiateOffboarding}
              onViewWorkflow={(id) => { setSheetOpen(false); navigate(`/onoff-boarding/workflow-detail/${id}`); }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Offboarding Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Offboarding — {selectedUser?.name || selectedUser?.email}</DialogTitle>
            <DialogDescription>Configure the offboarding workflow for this employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
              <div><Label>Last Day</Label><Input type="date" value={form.lastDay} onChange={e => setForm(p => ({ ...p, lastDay: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={form.reason || undefined} onValueChange={v => setForm(p => ({ ...p, reason: v }))}>
                <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  {["Resignation", "Termination", "Retirement", "Contract End", "Other"].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template</Label>
              <Select value={form.templateId || undefined} onValueChange={v => setForm(p => ({ ...p, templateId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                <SelectContent>
                  {activeTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({Array.isArray(t.default_tasks) ? t.default_tasks.length : 0} tasks)</SelectItem>)}
                  {activeTemplates.length === 0 && <SelectItem value="_none" disabled>No templates</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Offboarding
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── User Detail Sheet Content ────────────────────────────────────────
function UserDetailSheet({ user, activeWorkflow, onInitiateOffboarding, onViewWorkflow }: {
  user: AppUser;
  activeWorkflow: any;
  onInitiateOffboarding: () => void;
  onViewWorkflow: (id: string) => void;
}) {
  const { data: assets = [], isLoading: assetsLoading } = useUserAssets(user.id);
  const { data: licenses = [], isLoading: licensesLoading } = useUserLicenses(user.id);

  return (
    <>
      <SheetHeader>
        <SheetTitle>{user.name || user.email}</SheetTitle>
        <SheetDescription>View employee details, assigned assets, and licenses.</SheetDescription>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="capitalize">{user.role || "—"}</span></div>
        </div>

        <Separator />

        {activeWorkflow ? (
          <Button variant="outline" className="w-full gap-2" onClick={() => onViewWorkflow(activeWorkflow.id)}>
            <ExternalLink className="h-4 w-4" />
            View Active Offboarding Workflow
          </Button>
        ) : (
          <Button variant="destructive" className="w-full gap-2" onClick={onInitiateOffboarding}>
            <UserMinus className="h-4 w-4" />
            Initiate Offboarding
          </Button>
        )}

        <Separator />

        <div>
          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2"><Package className="h-4 w-4" />Assigned Assets ({assets.length})</h4>
          {assetsLoading ? (
            <div className="space-y-1.5">{[1,2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : assets.length === 0 ? (
            <p className="text-xs text-muted-foreground">No assets assigned</p>
          ) : (
            <div className="space-y-1">
              {assets.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                  <div>
                    <span className="font-medium">{a.name}</span>
                    {a.asset_tag && <span className="text-muted-foreground ml-1.5 text-xs">({a.asset_tag})</span>}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{a.category_name || a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2"><CreditCard className="h-4 w-4" />Assigned Licenses ({licenses.length})</h4>
          {licensesLoading ? (
            <div className="space-y-1.5">{[1,2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : licenses.length === 0 ? (
            <p className="text-xs text-muted-foreground">No licenses assigned</p>
          ) : (
            <div className="space-y-1">
              {licenses.map(l => (
                <div key={l.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                  <span className="font-medium">{l.tool_name}</span>
                  <span className="text-xs text-muted-foreground">{l.license_key ? l.license_key.slice(0, 12) + "…" : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
