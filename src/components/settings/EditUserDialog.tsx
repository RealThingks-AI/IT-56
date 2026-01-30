import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { normalizeRole } from "@/lib/userUtils";

const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["active", "inactive", "suspended"]),
  role: z.enum(["admin", "manager", "user", "viewer"]),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

export interface UserToEdit {
  id: string;
  authUserId: string;
  email: string;
  name: string | null;
  status: string | null;
  role: string;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserToEdit | null;
}

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: "",
      status: "active",
      role: "user",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        status: (user.status as "active" | "inactive" | "suspended") || "active",
        role: normalizeRole(user.role),
      });
    }
  }, [user, form]);

  const updateUser = useMutation({
    mutationFn: async (values: EditUserFormValues) => {
      if (!user) throw new Error("No user selected");

      if (!user.authUserId) {
        throw new Error("User auth ID not found. Please refresh and try again.");
      }

      const { error: profileError } = await supabase
        .from("users")
        .update({
          name: values.name,
          status: values.status,
        })
        .eq("id", user.id);

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

      const { error: roleError } = await supabase.rpc("update_user_role", {
        target_user_id: user.authUserId,
        new_role: values.role,
      });

      if (roleError) {
        throw new Error(`Failed to update role: ${roleError.message}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  const onSubmit = (values: EditUserFormValues) => {
    updateUser.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4" />
            Edit User
          </DialogTitle>
          <DialogDescription className="text-xs">
            {user?.email || "Update user details"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} className="h-9" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Inline layout for Role and Status */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={updateUser.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateUser.isPending}>
                {updateUser.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}