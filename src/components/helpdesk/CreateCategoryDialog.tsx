import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganisation } from "@/contexts/OrganisationContext";

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory?: { id: number; name: string; description?: string | null } | null;
}

export const CreateCategoryDialog = ({
  open,
  onOpenChange,
  editingCategory,
}: CreateCategoryDialogProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { organisation } = useOrganisation();

  // Get current user's tenant_id
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-tenant", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();

      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      const { data: orgFromFunction } = await supabase.rpc("get_user_org");

      return {
        tenant_id: profileData?.tenant_id,
        organisation_id: orgFromFunction || userData?.organisation_id,
      };
    },
    enabled: !!user,
  });

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: editingCategory?.name || "",
      description: editingCategory?.description || "",
    },
  });

  const createCategory = useMutation({
    mutationFn: async (values: z.infer<typeof categorySchema>) => {
      if (editingCategory) {
        // Update existing category
        const { data, error } = await supabase
          .from("helpdesk_categories")
          .update({
            name: values.name,
            description: values.description || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCategory.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Default tenant_id to 1 for org users (standard tenant)
        const tenantId = userProfile?.tenant_id || 1;
        const organisationId = userProfile?.organisation_id;

        if (!organisationId) {
          throw new Error("Organisation information is not configured. Please contact your administrator.");
        }

        // Check if category with same name already exists for this organisation
        const { data: existing } = await supabase
          .from("helpdesk_categories")
          .select("id")
          .eq("name", values.name)
          .eq("organisation_id", organisationId)
          .maybeSingle();

        if (existing) {
          throw new Error(`A category named "${values.name}" already exists. Please use a different name.`);
        }

        // Create new category
        const categoryData = {
          name: values.name,
          description: values.description || null,
          is_active: true,
          tenant_id: tenantId,
          organisation_id: organisationId,
        };

        const { data, error } = await supabase
          .from("helpdesk_categories")
          .insert(categoryData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(
        editingCategory ? "Category updated successfully" : "Category created successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["helpdesk-categories"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to ${editingCategory ? "update" : "create"} category: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof categorySchema>) => {
    createCategory.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingCategory ? "Edit Category" : "Create New Category"}</DialogTitle>
          <DialogDescription>
            {editingCategory
              ? "Update the category details below."
              : "Add a new category for organizing tickets."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Hardware, Software, Network" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this category..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createCategory.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCategory ? "Update" : "Create"} Category
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
