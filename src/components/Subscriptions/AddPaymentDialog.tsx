import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CURRENCY_SYMBOLS, CURRENCIES } from "@/lib/subscriptions/subscriptionUtils";

const formSchema = z.object({
  tool_id: z.string().min(1, "Tool is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().default("INR"),
  payment_date: z.string().min(1, "Date is required"),
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
  defaultToolId?: string;
}

export const AddPaymentDialog = ({ open, onOpenChange, onSuccess, editingPayment, defaultToolId }: AddPaymentDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: tools } = useQuery({
    queryKey: ["subscriptions-tools-active"],
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions_tools")
        .select("id, tool_name, currency")
        .in("status", ["active", "trial", "expiring_soon"])
        .order("tool_name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tool_id: "", amount: 0, currency: "INR", payment_date: "",
      status: "paid", payment_method: "", invoice_number: "", notes: "",
    },
  });

  const watchToolId = form.watch("tool_id");

  // Auto-set currency from selected tool
  useEffect(() => {
    if (!watchToolId || editingPayment) return;
    const tool = tools?.find(t => t.id === watchToolId);
    if (tool?.currency) {
      form.setValue("currency", tool.currency);
    }
  }, [watchToolId, tools, form, editingPayment]);

  useEffect(() => {
    if (!open) return;
    if (editingPayment) {
      form.reset({
        tool_id: editingPayment.tool_id || "",
        amount: editingPayment.amount || 0,
        currency: editingPayment.currency || "INR",
        payment_date: editingPayment.payment_date || "",
        status: editingPayment.status || "paid",
        payment_method: editingPayment.payment_method || "",
        invoice_number: editingPayment.invoice_number || "",
        notes: editingPayment.notes || "",
      });
    } else {
      form.reset({
        tool_id: defaultToolId || "", amount: 0, currency: "INR", payment_date: "",
        status: "paid", payment_method: "", invoice_number: "", notes: "",
      });
    }
  }, [editingPayment, form, open, defaultToolId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        tool_id: values.tool_id,
        amount: values.amount,
        currency: values.currency,
        payment_date: values.payment_date,
        status: values.status,
        payment_method: values.payment_method || null,
        invoice_number: values.invoice_number || null,
        notes: values.notes || null,
      };

      const { error } = editingPayment
        ? await supabase.from("subscriptions_payments").update(payload).eq("id", editingPayment.id)
        : await supabase.from("subscriptions_payments").insert(payload);

      if (error) throw error;
      toast({ title: "Success", description: editingPayment ? "Payment updated" : "Payment recorded" });
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save payment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{editingPayment ? "Edit Payment" : "Record Payment"}</DialogTitle>
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

            <div className="grid grid-cols-3 gap-2">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Amount *</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0.01" placeholder="0.00" className="h-8 text-sm" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="payment_date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Date *</FormLabel>
                  <FormControl><Input type="date" className="h-8 text-sm" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="payment_method" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Method</FormLabel>
                  <Select onValueChange={v => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                    <FormControl><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="netbanking">Net Banking</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="invoice_number" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Invoice #</FormLabel>
                <FormControl><Input placeholder="INV-001" className="h-8 text-sm" {...field} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Notes</FormLabel>
                <FormControl><Textarea placeholder="Payment notes..." rows={2} className="min-h-[48px] text-sm" {...field} /></FormControl>
              </FormItem>
            )} />

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingPayment ? "Save Changes" : "Add Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
