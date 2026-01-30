import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, MessageSquareText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface CannedResponse {
  id: number;
  title: string;
  content: string;
  shortcut: string | null;
  category_id: number | null;
  is_public: boolean;
  category?: { name: string } | null;
}

export const CannedResponsesManager = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    shortcut: "",
    category_id: "",
    is_public: true,
  });
  const queryClient = useQueryClient();

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["canned-responses-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_canned_responses")
        .select("*, category:helpdesk_categories(name)")
        .order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["helpdesk-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("helpdesk_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-for-canned"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("users")
        .select("id, organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();

      return { ...data, tenant_id: profileData?.tenant_id || 1 };
    },
  });

  const saveResponse = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("User not found");

      const payload = {
        title: formData.title,
        content: formData.content,
        shortcut: formData.shortcut || null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        is_public: formData.is_public,
        organisation_id: currentUser.organisation_id,
        tenant_id: currentUser.tenant_id,
      };

      if (editingResponse) {
        const { error } = await supabase
          .from("helpdesk_canned_responses")
          .update(payload)
          .eq("id", editingResponse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("helpdesk_canned_responses")
          .insert({ ...payload, created_by: currentUser.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingResponse ? "Response updated" : "Response created");
      queryClient.invalidateQueries({ queryKey: ["canned-responses-admin"] });
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error("Failed to save response: " + error.message);
    },
  });

  const deleteResponse = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("helpdesk_canned_responses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Response deleted");
      queryClient.invalidateQueries({ queryKey: ["canned-responses-admin"] });
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
    },
  });

  const handleOpenDialog = (response?: CannedResponse) => {
    if (response) {
      setEditingResponse(response);
      setFormData({
        title: response.title,
        content: response.content,
        shortcut: response.shortcut || "",
        category_id: response.category_id?.toString() || "",
        is_public: response.is_public ?? true,
      });
    } else {
      setEditingResponse(null);
      setFormData({
        title: "",
        content: "",
        shortcut: "",
        category_id: "",
        is_public: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingResponse(null);
    setFormData({
      title: "",
      content: "",
      shortcut: "",
      category_id: "",
      is_public: true,
    });
  };

  const filteredResponses = responses.filter((r: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(searchLower) ||
      r.content.toLowerCase().includes(searchLower) ||
      r.shortcut?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" />
            Canned Responses
          </CardTitle>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Response
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search responses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredResponses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? "No responses match your search" : "No canned responses yet"}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Shortcut</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response: any) => (
                  <TableRow key={response.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{response.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {response.content}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {response.shortcut && (
                        <Badge variant="outline" className="font-mono">
                          /{response.shortcut}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {response.category?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={response.is_public ? "default" : "secondary"}>
                        {response.is_public ? "Public" : "Private"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(response)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteResponse.mutate(response.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingResponse ? "Edit Canned Response" : "New Canned Response"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Password Reset Instructions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="The response text that will be inserted..."
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shortcut">Shortcut</Label>
                <Input
                  id="shortcut"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                  placeholder="e.g., password"
                />
                <p className="text-xs text-muted-foreground">
                  Type /{formData.shortcut || "shortcut"} to insert
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_public">Public</Label>
                <p className="text-xs text-muted-foreground">
                  Available to all agents
                </p>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => saveResponse.mutate()}
              disabled={!formData.title || !formData.content || saveResponse.isPending}
            >
              {saveResponse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingResponse ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
