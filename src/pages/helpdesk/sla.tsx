import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, AlertCircle, CheckCircle2, Settings, TrendingUp, Trash2, Loader2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SLAPolicy {
  id: number;
  name: string;
  priority: string;
  response_time_hours: number;
  response_time_minutes: number | null;
  resolution_time_hours: number;
  resolution_time_minutes: number | null;
  is_active: boolean;
  escalation_rule: any;
}

export default function HelpdeskSLA() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("medium");
  const [responseHours, setResponseHours] = useState("4");
  const [responseMinutes, setResponseMinutes] = useState("0");
  const [resolutionHours, setResolutionHours] = useState("24");
  const [resolutionMinutes, setResolutionMinutes] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-details"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("users")
        .select("id, organisation_id, role")
        .eq("auth_user_id", user.id)
        .single();
      return data;
    },
  });

  const { data: slaPolicies, isLoading } = useQuery({
    queryKey: ["sla-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_sla_policies")
        .select("*")
        .order("priority");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: slaStats } = useQuery({
    queryKey: ["sla-stats"],
    queryFn: async () => {
      // Get active policies count
      const activePolicies = slaPolicies?.filter(p => p.is_active).length || 0;
      
      // Get tickets with SLA data
      const { data: tickets } = await supabase
        .from("helpdesk_tickets")
        .select("id, sla_breached, status, resolved_at, sla_due_date, created_at")
        .eq("is_deleted", false);

      const totalTickets = tickets?.length || 0;
      const resolvedTickets = tickets?.filter(t => t.resolved_at).length || 0;
      const breachedTickets = tickets?.filter(t => t.sla_breached).length || 0;
      const complianceRate = totalTickets > 0 
        ? Math.round(((resolvedTickets - breachedTickets) / Math.max(resolvedTickets, 1)) * 100)
        : 0;

      return {
        activePolicies,
        complianceRate: Math.max(0, complianceRate),
        breaches: breachedTickets,
        trend: 0,
      };
    },
    enabled: !!slaPolicies,
  });

  const createPolicy = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      const payload = {
        name,
        priority,
        response_time_hours: parseInt(responseHours) || 0,
        response_time_minutes: parseInt(responseMinutes) || 0,
        resolution_time_hours: parseInt(resolutionHours) || 0,
        resolution_time_minutes: parseInt(resolutionMinutes) || 0,
        is_active: isActive,
        organisation_id: currentUser.organisation_id,
        tenant_id: profileData?.tenant_id || 1,
      };

      if (editingPolicy) {
        const { error } = await supabase
          .from("helpdesk_sla_policies")
          .update(payload)
          .eq("id", editingPolicy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("helpdesk_sla_policies")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPolicy ? "SLA policy updated" : "SLA policy created");
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deletePolicy = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("helpdesk_sla_policies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SLA policy deleted");
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const togglePolicyActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { error } = await supabase
        .from("helpdesk_sla_policies")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
    },
  });

  const resetForm = () => {
    setName("");
    setPriority("medium");
    setResponseHours("4");
    setResponseMinutes("0");
    setResolutionHours("24");
    setResolutionMinutes("0");
    setIsActive(true);
    setEditingPolicy(null);
  };

  const openEditDialog = (policy: SLAPolicy) => {
    setEditingPolicy(policy);
    setName(policy.name);
    setPriority(policy.priority);
    setResponseHours(policy.response_time_hours.toString());
    setResponseMinutes((policy.response_time_minutes || 0).toString());
    setResolutionHours(policy.resolution_time_hours.toString());
    setResolutionMinutes((policy.resolution_time_minutes || 0).toString());
    setIsActive(policy.is_active);
    setDialogOpen(true);
  };

  const formatTime = (hours: number, minutes: number | null) => {
    const h = hours;
    const m = minutes || 0;
    if (h === 0 && m > 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">SLA Policies</h2>
          <p className="text-muted-foreground">Service Level Agreement policies and compliance tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New SLA Policy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPolicy ? "Edit SLA Policy" : "Create SLA Policy"}</DialogTitle>
              <DialogDescription>
                Define response and resolution time targets for tickets based on priority
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Policy Name</Label>
                <Input
                  placeholder="e.g., Standard SLA - High Priority"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Priority Level</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Response Time Target</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Hours"
                      value={responseHours}
                      onChange={(e) => setResponseHours(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">Hours</span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Minutes"
                      value={responseMinutes}
                      onChange={(e) => setResponseMinutes(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">Minutes</span>
                  </div>
                </div>
              </div>
              <div>
                <Label>Resolution Time Target</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Hours"
                      value={resolutionHours}
                      onChange={(e) => setResolutionHours(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">Hours</span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Minutes"
                      value={resolutionMinutes}
                      onChange={(e) => setResolutionMinutes(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">Minutes</span>
                  </div>
                </div>
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
              <Button onClick={() => createPolicy.mutate()} disabled={!name || createPolicy.isPending}>
                {createPolicy.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingPolicy ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slaStats?.activePolicies || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slaStats?.complianceRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slaStats?.breaches || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total breaches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slaStats?.trend || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : slaPolicies && slaPolicies.length > 0 ? (
            <div className="space-y-3">
              {slaPolicies.map((policy: SLAPolicy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Badge className={`${getPriorityColor(policy.priority)} text-white capitalize`}>
                      {policy.priority}
                    </Badge>
                    <div>
                      <h4 className="font-medium">{policy.name}</h4>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Response: {formatTime(policy.response_time_hours, policy.response_time_minutes)}</span>
                        <span>Resolution: {formatTime(policy.resolution_time_hours, policy.resolution_time_minutes)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={policy.is_active}
                      onCheckedChange={(checked) => togglePolicyActive.mutate({ id: policy.id, isActive: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(policy)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePolicy.mutate(policy.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No SLA policies configured</p>
              <p className="text-sm text-muted-foreground mb-4">
                Define response and resolution times for different ticket priorities
              </p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First SLA Policy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}