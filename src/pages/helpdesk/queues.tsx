import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ListFilter, Users, Clock, Trash2, Loader2, Edit2, Settings } from "lucide-react";
import { toast } from "sonner";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUserDisplayName, getUserInitials } from "@/lib/userUtils";

interface Queue {
  id: number;
  name: string;
  description: string | null;
  email_address: string | null;
  assignment_method: string;
  auto_assign: boolean;
  is_active: boolean;
  sla_policy_id: number | null;
}

export default function HelpdeskQueues() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [assignmentMethod, setAssignmentMethod] = useState("round_robin");
  const [autoAssign, setAutoAssign] = useState(false);
  const [slaPolicyId, setSlaPolicyId] = useState<string>("");

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

  const { data: queues, isLoading } = useQuery({
    queryKey: ["helpdesk-queues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_queues")
        .select("*, sla_policy:helpdesk_sla_policies(name)")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: slaPolicies } = useQuery({
    queryKey: ["sla-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_sla_policies")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: queueMembers } = useQuery({
    queryKey: ["queue-members", selectedQueueId],
    queryFn: async () => {
      if (!selectedQueueId) return [];
      const { data, error } = await supabase
        .from("helpdesk_queue_members")
        .select("*, agent:users!helpdesk_queue_members_agent_id_fkey(id, name, email)")
        .eq("queue_id", selectedQueueId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedQueueId,
  });

  const { data: orgUsers } = useQuery({
    queryKey: ["org-users", currentUser?.organisation_id],
    queryFn: async () => {
      if (!currentUser?.organisation_id) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("organisation_id", currentUser.organisation_id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.organisation_id,
  });

  const activeQueues = queues?.filter(q => q.is_active).length || 0;
  const totalAgents = new Set(queueMembers?.map(m => m.agent_id)).size;

  const createQueue = useMutation({
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
        email_address: emailAddress || null,
        assignment_method: assignmentMethod,
        auto_assign: autoAssign,
        sla_policy_id: slaPolicyId ? parseInt(slaPolicyId) : null,
        organisation_id: currentUser.organisation_id,
        tenant_id: profileData?.tenant_id || 1,
        is_active: true,
      };

      if (editingQueue) {
        const { error } = await supabase
          .from("helpdesk_queues")
          .update(payload)
          .eq("id", editingQueue.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("helpdesk_queues")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingQueue ? "Queue updated" : "Queue created");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-queues"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteQueue = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("helpdesk_queues")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Queue deleted");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-queues"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addQueueMember = useMutation({
    mutationFn: async (agentId: string) => {
      if (!selectedQueueId) throw new Error("No queue selected");
      const { error } = await supabase
        .from("helpdesk_queue_members")
        .insert({
          queue_id: selectedQueueId,
          agent_id: agentId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member added");
      queryClient.invalidateQueries({ queryKey: ["queue-members", selectedQueueId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeQueueMember = useMutation({
    mutationFn: async (memberId: number) => {
      const { error } = await supabase
        .from("helpdesk_queue_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["queue-members", selectedQueueId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setEmailAddress("");
    setAssignmentMethod("round_robin");
    setAutoAssign(false);
    setSlaPolicyId("");
    setEditingQueue(null);
  };

  const openEditDialog = (queue: Queue) => {
    setEditingQueue(queue);
    setName(queue.name);
    setDescription(queue.description || "");
    setEmailAddress(queue.email_address || "");
    setAssignmentMethod(queue.assignment_method);
    setAutoAssign(queue.auto_assign);
    setSlaPolicyId(queue.sla_policy_id?.toString() || "");
    setDialogOpen(true);
  };

  const openMembersDialog = (queueId: number) => {
    setSelectedQueueId(queueId);
    setMembersDialogOpen(true);
  };

  const getInitials = (name?: string, email?: string) => {
    return getUserInitials({ name, email });
  };

  const availableUsers = orgUsers?.filter(
    u => !queueMembers?.some(m => m.agent_id === u.id)
  );

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Ticket Queues</h2>
          <p className="text-muted-foreground">Organize and manage ticket queues</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Queue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingQueue ? "Edit Queue" : "Create Queue"}</DialogTitle>
              <DialogDescription>
                Create a queue to organize tickets and assign agents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Queue Name *</Label>
                <Input
                  placeholder="e.g., IT Support, HR Requests"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of this queue"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Label>Email Address (optional)</Label>
                <Input
                  type="email"
                  placeholder="support@company.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
              <div>
                <Label>Assignment Method</Label>
                <Select value={assignmentMethod} onValueChange={setAssignmentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="load_balanced">Load Balanced</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>SLA Policy</Label>
                <Select value={slaPolicyId || "none"} onValueChange={(val) => setSlaPolicyId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select SLA policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No SLA</SelectItem>
                    {slaPolicies?.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id.toString()}>
                        {policy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Auto-assign tickets</Label>
                <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={() => createQueue.mutate()} disabled={!name || createQueue.isPending}>
                {createQueue.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingQueue ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queues</CardTitle>
            <ListFilter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeQueues}</div>
            <p className="text-xs text-muted-foreground mt-1">Active queues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Agents</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
            <p className="text-xs text-muted-foreground mt-1">Total agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Average queue time</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Queue Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Add Member</Label>
              <Select onValueChange={(value) => addQueueMember.mutate(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {getUserDisplayName(user) || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {queueMembers && queueMembers.length > 0 ? (
                queueMembers.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInitials(member.agent?.name, member.agent?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{getUserDisplayName(member.agent) || member.agent?.email || "Unknown"}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQueueMember.mutate(member.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Queue List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : queues && queues.length > 0 ? (
            <div className="space-y-3">
              {queues.map((queue: any) => (
                <div
                  key={queue.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${queue.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <h4 className="font-medium">{queue.name}</h4>
                      {queue.description && (
                        <p className="text-sm text-muted-foreground">{queue.description}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {queue.assignment_method.replace('_', ' ')}
                        </Badge>
                        {queue.sla_policy && (
                          <Badge variant="secondary" className="text-xs">
                            {queue.sla_policy.name}
                          </Badge>
                        )}
                        {queue.auto_assign && (
                          <Badge variant="secondary" className="text-xs">Auto-assign</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openMembersDialog(queue.id)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Members
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(queue)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteQueue.mutate(queue.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ListFilter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No queues configured</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Queue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}