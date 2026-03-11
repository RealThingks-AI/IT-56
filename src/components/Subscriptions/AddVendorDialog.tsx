import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(1, "Vendor name is required").max(200),
  contact_name: z.string().optional(),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

interface AddVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingVendor?: any;
}

export const AddVendorDialog = ({ open, onOpenChange, onSuccess, editingVendor }: AddVendorDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", contact_name: "", contact_email: "", contact_phone: "",
      website: "", address: "", notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editingVendor) {
      form.reset({
        name: editingVendor.name || "",
        contact_name: editingVendor.contact_name || "",
        contact_email: editingVendor.contact_email || "",
        contact_phone: editingVendor.contact_phone || "",
        website: editingVendor.website || "",
        address: editingVendor.address || "",
        notes: editingVendor.notes || "",
      });
    } else {
      form.reset({ name: "", contact_name: "", contact_email: "", contact_phone: "", website: "", address: "", notes: "" });
    }
  }, [editingVendor, form, open]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name,
        contact_name: values.contact_name || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        website: values.website || null,
        address: values.address || null,
        notes: values.notes || null,
      };

      const { error } = editingVendor
        ? await supabase.from("subscriptions_vendors").update(payload).eq("id", editingVendor.id)
        : await supabase.from("subscriptions_vendors").insert(payload);

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["subscriptions-vendors"] });
      toast({ title: "Success", description: editingVendor ? "Vendor updated" : "Vendor added" });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save vendor", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Vendor Name *</FormLabel>
                <FormControl><Input placeholder="e.g., Microsoft, Adobe" className="h-8 text-sm" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="contact_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Contact Person</FormLabel>
                  <FormControl><Input placeholder="Contact name" className="h-8 text-sm" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Phone</FormLabel>
                  <FormControl><Input placeholder="+1 234 567 8900" className="h-8 text-sm" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="contact_email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Email</FormLabel>
                  <FormControl><Input type="email" placeholder="contact@vendor.com" className="h-8 text-sm" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Website</FormLabel>
                  <FormControl><Input placeholder="https://vendor.com" className="h-8 text-sm" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Address</FormLabel>
                <FormControl><Input placeholder="Vendor address" className="h-8 text-sm" {...field} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Notes</FormLabel>
                <FormControl><Textarea placeholder="Additional notes..." rows={2} className="min-h-[48px] text-sm" {...field} /></FormControl>
              </FormItem>
            )} />

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingVendor ? "Save Changes" : "Add Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
