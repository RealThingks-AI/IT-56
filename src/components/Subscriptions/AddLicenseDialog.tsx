import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  tool_id: z.string().min(1, "Tool is required"),
  license_key: z.string().optional(),
  status: z.string().default("available"),
  assigned_to: z.string().optional(),
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
}

export const AddLicenseDialog = ({ open, onOpenChange, onSuccess, editingLicense }: AddLicenseDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single-company mode: RLS handles access control, no org filter needed for reads
  const { data: tools } = useQuery({
    queryKey: ["subscriptions-tools-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions_tools")
        .select("id, tool_name")
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tool_id: "",
      license_key: "",
      status: "available",
      assigned_to: "",
      assigned_to_name: "",
      assigned_to_email: "",
      assigned_at: "",
      expires_at: "",
    },
  });

  useEffect(() => {
    if (editingLicense) {
      form.reset({
        tool_id: editingLicense.tool_id || "",
        license_key: editingLicense.license_key || "",
        status: editingLicense.status || "available",
        assigned_to: editingLicense.assigned_to || "",
        assigned_to_name: editingLicense.assigned_to_name || "",
        assigned_to_email: editingLicense.assigned_to_email || "",
        assigned_at: editingLicense.assigned_at || "",
        expires_at: editingLicense.expires_at || "",
      });
    } else {
      form.reset({
        tool_id: "",
        license_key: "",
        status: "available",
        assigned_to: "",
        assigned_to_name: "",
        assigned_to_email: "",
        assigned_at: "",
        expires_at: "",
      });
    }
  }, [editingLicense, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const licenseData = {
        tool_id: values.tool_id,
        license_key: values.license_key || null,
        status: values.status,
        assigned_to: values.assigned_to || null,
        assigned_to_name: values.assigned_to_name || null,
        assigned_to_email: values.assigned_to_email || null,
        assigned_at: values.assigned_at || null,
        expires_at: values.expires_at || null,
      };

      if (editingLicense) {
        const { error } = await supabase
          .from("subscriptions_licenses")
          .update(licenseData)
          .eq("id", editingLicense.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "License updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("subscriptions_licenses")
          .insert(licenseData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "License added successfully",
        });
      }

      form.reset();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingLicense ? "update" : "add"} license`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingLicense ? "Edit License" : "Add New License"}</DialogTitle>
          <DialogDescription>
            {editingLicense ? "Update license information" : "Add a new software license to track"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tool_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tool" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tools?.map((tool) => (
                        <SelectItem key={tool.id} value={tool.id}>
                          {tool.tool_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="license_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Key</FormLabel>
                  <FormControl>
                    <Input placeholder="XXXX-XXXX-XXXX-XXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigned_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingLicense ? "Update License" : "Add License"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};