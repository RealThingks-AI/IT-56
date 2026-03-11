import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useUsers } from "@/hooks/useUsers";
import { ChevronsUpDown, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  tool_id: z.string().min(1, "Tool is required"),
  license_key: z.string().optional(),
  status: z.string().default("available"),
  user_id: z.string().optional(), // system user UUID
  assigned_to_name: z.string().optional(),
  assigned_to_email: z.string().optional(),
  assigned_at: z.string().optional(),
  expires_at: z.string().optional(),
});

interface AddLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingLicense?: any;
  defaultToolId?: string;
}

export const AddLicenseDialog = ({ open, onOpenChange, onSuccess, editingLicense, defaultToolId }: AddLicenseDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const { data: tools } = useQuery({
    queryKey: ["subscriptions-tools-for-license"],
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions_tools")
        .select("id, tool_name")
        .in("status", ["active", "trial", "expiring_soon"])
        .order("tool_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useUsers();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tool_id: "", license_key: "", status: "assigned",
      user_id: "", assigned_to_name: "", assigned_to_email: "", assigned_at: "", expires_at: "",
    },
  });

  const watchUserId = form.watch("user_id");
  const selectedUser = users?.find(u => u.id === watchUserId);

  useEffect(() => {
    if (!open) return;
    if (editingLicense) {
      form.reset({
        tool_id: editingLicense.tool_id || "",
        license_key: editingLicense.license_key || "",
        status: editingLicense.status || "available",
        user_id: editingLicense.assigned_to || "",
        assigned_to_name: editingLicense.assigned_to_name || "",
        assigned_to_email: editingLicense.assigned_to_email || "",
        assigned_at: editingLicense.assigned_at || "",
        expires_at: editingLicense.expires_at || "",
      });
    } else {
      form.reset({
        tool_id: defaultToolId || "", license_key: "", status: "assigned",
        user_id: "", assigned_to_name: "", assigned_to_email: "", assigned_at: "", expires_at: "",
      });
    }
  }, [editingLicense, form, open, defaultToolId]);

  const handleUserSelect = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    if (user) {
      form.setValue("user_id", user.id);
      form.setValue("assigned_to_name", user.name || "");
      form.setValue("assigned_to_email", user.email || "");
      form.setValue("status", "assigned");
      if (!form.getValues("assigned_at")) {
        form.setValue("assigned_at", new Date().toISOString().split("T")[0]);
      }
    }
    setUserPickerOpen(false);
  };

  const handleClearUser = () => {
    form.setValue("user_id", "");
    form.setValue("assigned_to_name", "");
    form.setValue("assigned_to_email", "");
    form.setValue("status", "available");
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        tool_id: values.tool_id,
        license_key: values.license_key || null,
        status: values.status,
        assigned_to: values.user_id || null,
        assigned_to_name: values.assigned_to_name || null,
        assigned_to_email: values.assigned_to_email || null,
        assigned_at: values.assigned_at || null,
        expires_at: values.expires_at || null,
      };

      const { error } = editingLicense
        ? await supabase.from("subscriptions_licenses").update(payload).eq("id", editingLicense.id)
        : await supabase.from("subscriptions_licenses").insert(payload);

      if (error) throw error;
      toast({ title: "Success", description: editingLicense ? "License updated" : "License added" });
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save license", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{editingLicense ? "Edit License" : "Add License"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <FormField control={form.control} name="tool_id" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Subscription *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select subscription" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {tools?.map(t => <SelectItem key={t.id} value={t.id}>{t.tool_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="license_key" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">License Key</FormLabel>
                  <FormControl><Input placeholder="XXXX-XXXX-XXXX" className="h-8 text-sm" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {/* User picker from system users */}
            <FormItem>
              <FormLabel className="text-xs">Assign To User</FormLabel>
              <div className="flex items-center gap-2">
                <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="h-8 flex-1 justify-between text-sm font-normal"
                    >
                      {selectedUser
                        ? <span className="truncate">{selectedUser.name || selectedUser.email}</span>
                        : <span className="text-muted-foreground">Search system users...</span>
                      }
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[380px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by name or email..." className="h-8" />
                      <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                          {users?.map(user => (
                            <CommandItem
                              key={user.id}
                              value={`${user.name || ""} ${user.email}`}
                              onSelect={() => handleUserSelect(user.id)}
                              className="cursor-pointer"
                            >
                              <Check className={cn("mr-2 h-3.5 w-3.5", watchUserId === user.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="text-sm">{user.name || "—"}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedUser && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleClearUser}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {selectedUser && (
                <p className="text-xs text-muted-foreground mt-1">{selectedUser.email} · Status auto-set to Assigned</p>
              )}
            </FormItem>

            {/* Manual fallback fields (shown when no system user selected) */}
            {!selectedUser && (
              <div className="grid grid-cols-2 gap-2">
                <FormField control={form.control} name="assigned_to_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Name (External)</FormLabel>
                    <FormControl><Input placeholder="Name" className="h-8 text-sm" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="assigned_to_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Email (External)</FormLabel>
                    <FormControl><Input type="email" placeholder="user@company.com" className="h-8 text-sm" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="assigned_at" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Assigned Date</FormLabel>
                  <FormControl><Input type="date" className="h-8 text-sm" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="expires_at" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Expiry Date</FormLabel>
                  <FormControl><Input type="date" className="h-8 text-sm" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingLicense ? "Save Changes" : "Add License"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
