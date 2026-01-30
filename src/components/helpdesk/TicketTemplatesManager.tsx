import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Loader2, Edit2, FileText, Copy } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TicketTemplate {
  id: number;
  name: string;
  title: string | null;
  description: string | null;
  priority: string | null;
  category_id: number | null;
  is_active: boolean;
  form_fields: any;
  created_at: string;
}

export const TicketTemplatesManager = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [categoryId, setCategoryId] = useState<string>("");
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

  const { data: templates, isLoading } = useQuery({
    queryKey: ["ticket-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_ticket_templates")
        .select("*, category:helpdesk_categories(name)")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["helpdesk-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      const payload = {
        name,
        title: title || null,
        description: description || null,
        priority: priority || null,
        category_id: categoryId ? parseInt(categoryId) : null,
        is_active: isActive,
        organisation_id: currentUser.organisation_id,
        tenant_id: profileData?.tenant_id || 1,
        created_by: currentUser.id,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("helpdesk_ticket_templates")
          .update(payload)
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("helpdesk_ticket_templates")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingTemplate ? "Template updated" : "Template created");
      queryClient.invalidateQueries({ queryKey: ["ticket-templates"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("helpdesk_ticket_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["ticket-templates"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (template: TicketTemplate) => {
      if (!currentUser) throw new Error("Not authenticated");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      const { error } = await supabase
        .from("helpdesk_ticket_templates")
        .insert({
          name: `${template.name} (Copy)`,
          title: template.title,
          description: template.description,
          priority: template.priority,
          category_id: template.category_id,
          is_active: false,
          organisation_id: currentUser.organisation_id,
          tenant_id: profileData?.tenant_id || 1,
          created_by: currentUser.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template duplicated");
      queryClient.invalidateQueries({ queryKey: ["ticket-templates"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategoryId("");
    setIsActive(true);
    setEditingTemplate(null);
  };

  const openEditDialog = (template: TicketTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setTitle(template.title || "");
    setDescription(template.description || "");
    setPriority(template.priority || "medium");
    setCategoryId(template.category_id?.toString() || "");
    setIsActive(template.is_active);
    setDialogOpen(true);
  };

  const filteredTemplates = templates?.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'high': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-500/10 text-green-700 border-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Ticket Templates</CardTitle>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Default Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template: any) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {template.title || "—"}
                  </TableCell>
                  <TableCell>
                    {template.category?.name ? (
                      <Badge variant="outline">{template.category.name}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {template.priority ? (
                      <Badge className={`capitalize ${getPriorityColor(template.priority)}`}>
                        {template.priority}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicateTemplate.mutate(template)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this template?")) {
                            deleteTemplate.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No ticket templates found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create templates to pre-fill ticket forms with common issue types
            </p>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              Templates pre-fill ticket forms with common issue types and default values
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., Password Reset Request"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Default Ticket Title</Label>
              <Input
                placeholder="e.g., Password Reset for [Employee Name]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Default Description</Label>
              <Textarea
                placeholder="Pre-filled description for this ticket type..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Category</Label>
                <Select
                  value={categoryId || "none"}
                  onValueChange={(val) => setCategoryId(val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default Priority</Label>
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
            <Button onClick={() => createTemplate.mutate()} disabled={!name || createTemplate.isPending}>
              {createTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
