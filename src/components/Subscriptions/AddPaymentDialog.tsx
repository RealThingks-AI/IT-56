import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  tool_id: z.string().min(1, "Tool is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("INR"),
  payment_date: z.string().min(1, "Payment date is required"),
  status: z.string().default("paid"),
  payment_method: z.string().optional(),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
});

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingPayment?: any;
}

export const AddPaymentDialog = ({ open, onOpenChange, onSuccess, editingPayment }: AddPaymentDialogProps) => {
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
      amount: "",
      currency: "INR",
      payment_date: "",
      status: "paid",
      payment_method: "",
      invoice_number: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (editingPayment) {
      form.reset({
        tool_id: editingPayment.tool_id || "",
        amount: editingPayment.amount?.toString() || "",
        currency: editingPayment.currency || "INR",
        payment_date: editingPayment.payment_date || "",
        status: editingPayment.status || "paid",
        payment_method: editingPayment.payment_method || "",
        invoice_number: editingPayment.invoice_number || "",
        notes: editingPayment.notes || "",
      });
    } else {
      form.reset({
        tool_id: "",
        amount: "",
        currency: "INR",
        payment_date: "",
        status: "paid",
        payment_method: "",
        invoice_number: "",
        notes: "",
      });
    }
  }, [editingPayment, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const paymentData = {
        tool_id: values.tool_id,
        amount: parseFloat(values.amount),
        currency: values.currency,
        payment_date: values.payment_date,
        status: values.status,
        payment_method: values.payment_method || null,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
      };

      if (editingPayment) {
        const { error } = await supabase
          .from("subscriptions_payments")
          .update(paymentData)
          .eq("id", editingPayment.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("subscriptions_payments")
          .insert(paymentData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment added successfully",
        });
      }

      form.reset();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingPayment ? "update" : "add"} payment`,
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
          <DialogTitle>{editingPayment ? "Edit Payment" : "Add New Payment"}</DialogTitle>
          <DialogDescription>
            {editingPayment ? "Update payment information" : "Record a new subscription payment"}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="netbanking">Net Banking</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoice_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingPayment ? "Update Payment" : "Add Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};