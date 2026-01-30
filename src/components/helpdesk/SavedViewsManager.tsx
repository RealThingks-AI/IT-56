import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, Plus, Star, Trash2, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
interface SavedViewsManagerProps {
  currentFilters: Record<string, any>;
  onApplyView: (filters: Record<string, any>) => void;
}
export const SavedViewsManager = ({
  currentFilters,
  onApplyView
}: SavedViewsManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const queryClient = useQueryClient();
  const {
    data: currentUser
  } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return null;
      const {
        data
      } = await supabase.from("users").select("id, organisation_id").eq("auth_user_id", user.id).single();
      return data;
    }
  });
  const {
    data: savedViews = []
  } = useQuery({
    queryKey: ["helpdesk-saved-views"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("helpdesk_saved_views").select("*").order("name");
      if (error) throw error;
      return data || [];
    }
  });
  const saveView = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("User not found");

      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase.from("helpdesk_saved_views").update({
          is_default: false
        }).eq("user_id", currentUser.id);
      }
      const {
        error
      } = await supabase.from("helpdesk_saved_views").insert({
        name: viewName,
        filters: currentFilters,
        user_id: currentUser.id,
        organisation_id: currentUser.organisation_id,
        is_default: isDefault,
        is_shared: isShared
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("View saved successfully");
      queryClient.invalidateQueries({
        queryKey: ["helpdesk-saved-views"]
      });
      setSaveDialogOpen(false);
      setViewName("");
      setIsDefault(false);
      setIsShared(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to save view: " + error.message);
    }
  });
  const deleteView = useMutation({
    mutationFn: async (viewId: number) => {
      const {
        error
      } = await supabase.from("helpdesk_saved_views").delete().eq("id", viewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("View deleted");
      queryClient.invalidateQueries({
        queryKey: ["helpdesk-saved-views"]
      });
    }
  });
  const setDefaultView = useMutation({
    mutationFn: async (viewId: number) => {
      if (!currentUser) throw new Error("User not found");

      // Unset all defaults first
      await supabase.from("helpdesk_saved_views").update({
        is_default: false
      }).eq("user_id", currentUser.id);

      // Set new default
      const {
        error
      } = await supabase.from("helpdesk_saved_views").update({
        is_default: true
      }).eq("id", viewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Default view updated");
      queryClient.invalidateQueries({
        queryKey: ["helpdesk-saved-views"]
      });
    }
  });
  const handleApplyView = (view: any) => {
    onApplyView(view.filters || {});
    setIsOpen(false);
  };
  const hasActiveFilters = Object.keys(currentFilters).some(key => currentFilters[key] !== null && currentFilters[key] !== undefined && currentFilters[key] !== "");
  return <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b">
            <p className="font-medium text-sm">Saved Views</p>
          </div>
          <ScrollArea className="max-h-64">
            {savedViews.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">
                No saved views yet
              </div> : <div className="p-1">
                {savedViews.map((view: any) => <div key={view.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors group">
                    <button className="flex-1 text-left text-sm truncate" onClick={() => handleApplyView(view)}>
                      {view.name}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDefaultView.mutate(view.id)} title={view.is_default ? "Default view" : "Set as default"}>
                        <Star className={`h-3.5 w-3.5 ${view.is_default ? "fill-yellow-400 text-yellow-400" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteView.mutate(view.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>)}
              </div>}
          </ScrollArea>
          {hasActiveFilters && <div className="p-2 border-t">
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setSaveDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Save Current View
              </Button>
            </div>}
        </PopoverContent>
      </Popover>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">View Name</Label>
              <Input id="view-name" placeholder="My Custom View" value={viewName} onChange={e => setViewName(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is-default">Set as default</Label>
              <Switch id="is-default" checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is-shared">Share with team</Label>
              <Switch id="is-shared" checked={isShared} onCheckedChange={setIsShared} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveView.mutate()} disabled={!viewName.trim()}>
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>;
};