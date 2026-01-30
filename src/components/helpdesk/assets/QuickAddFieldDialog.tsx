import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type FieldType = "site" | "location" | "category" | "department" | "make";

interface QuickAddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldType: FieldType;
  onSuccess: (id: string, name: string) => void;
  selectedSiteId?: string;
  sites?: Array<{ id: string; name: string }>;
}

const FIELD_CONFIG: Record<FieldType, { label: string; table: string; placeholder: string }> = {
  site: { label: "Site", table: "itam_sites", placeholder: "Enter site name" },
  location: { label: "Location", table: "itam_locations", placeholder: "Enter location name" },
  category: { label: "Category", table: "itam_categories", placeholder: "Enter category name" },
  department: { label: "Department", table: "itam_departments", placeholder: "Enter department name" },
  make: { label: "Make", table: "itam_makes", placeholder: "Enter make name" },
};

export function QuickAddFieldDialog({
  open,
  onOpenChange,
  fieldType,
  onSuccess,
  selectedSiteId,
  sites = [],
}: QuickAddFieldDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState<string | undefined>(selectedSiteId);

  const config = FIELD_CONFIG[fieldType];

  // Reset form when dialog opens/closes or fieldType changes
  useEffect(() => {
    if (open) {
      setName("");
      setSiteId(selectedSiteId);
    }
  }, [open, selectedSiteId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      const insertData: Record<string, unknown> = {
        name: name.trim(),
        organisation_id: userData?.organisation_id,
      };

      // Add site_id for locations
      if (fieldType === "location" && siteId) {
        insertData.site_id = siteId;
      }

      // @ts-ignore - Dynamic table name causes type issues
      const { data, error } = await supabase
        .from(config.table as any)
        .insert(insertData)
        .select("id, name")
        .single();

      if (error) throw error;
      return data as unknown as { id: string; name: string };
    },
    onSuccess: (data) => {
      toast.success(`${config.label} added successfully`);
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["itam-sites"] });
      queryClient.invalidateQueries({ queryKey: ["itam-locations"] });
      queryClient.invalidateQueries({ queryKey: ["itam-categories"] });
      queryClient.invalidateQueries({ queryKey: ["itam-departments"] });
      queryClient.invalidateQueries({ queryKey: ["itam-makes"] });
      onSuccess(data.id, data.name);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add ${config.label.toLowerCase()}: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add New {config.label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={config.placeholder}
                autoFocus
              />
            </div>

            {/* Show site selector for locations */}
            {fieldType === "location" && sites.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="site">Site (Optional)</Label>
                <Select 
                  value={siteId || "__none__"} 
                  onValueChange={(v) => setSiteId(v === "__none__" ? undefined : v)}
                >
                  <SelectTrigger id="site">
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Site</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || !name.trim()}
            >
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add {config.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
