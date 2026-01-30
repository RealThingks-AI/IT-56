import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, PlayCircle, PauseCircle, Activity, Trash2, Loader2, Edit2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const TRIGGER_TYPES = [
  { value: "ticket_created", label: "When ticket is created" },
  { value: "ticket_updated", label: "When ticket is updated" },
  { value: "sla_breach", label: "When SLA is about to breach" },
  { value: "time_based", label: "Time-based (scheduled)" },
];

const ACTION_TYPES = [
  { value: "assign_agent", label: "Assign to agent" },
  { value: "assign_queue", label: "Assign to queue" },
  { value: "update_priority", label: "Update priority" },
  { value: "add_tag", label: "Add tag" },
  { value: "send_notification", label: "Send notification" },
  { value: "escalate", label: "Escalate ticket" },
];

export default function HelpdeskAutomation() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("ticket_created");
  const [executionOrder, setExecutionOrder] = useState("10");
  const [isActive, setIsActive] = useState(true);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-details"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("users")
        .select("id, organisation_id, role, auth_user_id")
        .eq("auth_user_id", user.id)
        .single();
      return { ...data, authUserId: user.id };
    },
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_automation_rules")
        .select("*")
        .order("execution_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["automation-stats"],
    queryFn: async () => {
      const activeRules = rules?.filter(r => r.is_active).length || 0;
      const inactiveRules = rules?.filter(r => !r.is_active).length || 0;
      
      // Get today's execution count from logs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from("helpdesk_automation_logs")
        .select("id", { count: 'exact', head: true })
        .gte("executed_at", today.toISOString());
      
      return {
        activeRules,
        inactiveRules,
        executionsToday: count || 0,
        totalRules: rules?.length || 0,
      };
    },
    enabled: !!rules,
  });

  const createRule = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      const payload = {
        name,
        description: description || null,
        trigger_type: triggerType,
        execution_order: parseInt(executionOrder) || 10,
        is_active: isActive,
        conditions: {},
        actions: {},
        organisation_id: currentUser.organisation_id,
        tenant_id: profileData?.tenant_id || 1,
        created_by: currentUser.authUserId,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("helpdesk_automation_rules")
          .update(payload)
          .eq("id", editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("helpdesk_automation_rules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingRule ? "Rule updated" : "Rule created");
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("helpdesk_automation_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { error } = await supabase
        .from("helpdesk_automation_rules")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule updated");
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setTriggerType("ticket_created");
    setExecutionOrder("10");
    setIsActive(true);
    setEditingRule(null);
  };

  const openEditDialog = (rule: any) => {
    setEditingRule(rule);
    setName(rule.name);
    setDescription(rule.description || "");
    setTriggerType(rule.trigger_type);
    setExecutionOrder(rule.execution_order?.toString() || "10");
    setIsActive(rule.is_active);
    setDialogOpen(true);
  };

  const getTriggerLabel = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Automation Rules</h2>
          <p className="text-muted-foreground">Triggers, conditions, and actions engine</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <PlayCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeRules || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Rules</CardTitle>
            <PauseCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inactiveRules || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Paused or disabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.executionsToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Triggers fired</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Zap className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRules || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All automation rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
          <CardDescription>
            Rules are evaluated in order. Lower execution order runs first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          Order: {rule.execution_order}
                        </Badge>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-1">{rule.description}</p>
                      )}
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getTriggerLabel(rule.trigger_type)}
                        </Badge>
                        {rule.execution_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Executed {rule.execution_count}x
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleRule.mutate({ id: rule.id, isActive: rule.is_active })}
                      title={rule.is_active ? "Disable" : "Enable"}
                    >
                      {rule.is_active ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this rule?")) {
                          deleteRule.mutate(rule.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No automation rules configured</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create rules to automatically assign tickets, send notifications, or update fields
              </p>
              <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Rule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Automation Rule" : "Create Automation Rule"}</DialogTitle>
            <DialogDescription>
              Define when and what actions to perform automatically
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Rule Name *</Label>
              <Input
                placeholder="e.g., Auto-assign high priority tickets"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of what this rule does"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Trigger</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Execution Order</Label>
              <Input
                type="number"
                min="1"
                placeholder="10"
                value={executionOrder}
                onChange={(e) => setExecutionOrder(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers execute first
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={() => createRule.mutate()} disabled={!name || createRule.isPending}>
              {createRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
