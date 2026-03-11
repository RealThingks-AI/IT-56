import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Check, AlertTriangle, Users, X, ChevronsUpDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUsers } from "@/hooks/useUsers";
import { AddVendorDialog } from "./AddVendorDialog";
import {
  ALL_TOOL_QUERY_KEYS,
  CATEGORIES,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  USER_SELECTABLE_STATUSES,
  SUBSCRIPTION_TYPES,
  getSubscriptionFieldRules,
  computeEffectiveStatus,
  computeRenewalDate,
  getCycleThresholds,
  formatCost,
} from "@/lib/subscriptions/subscriptionUtils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEPARTMENTS = ["IT", "HR", "Finance", "Engineering", "Marketing", "Sales", "Operations", "Legal", "Support", "Other"] as const;

const formSchema = z.object({
  tool_name: z.string().trim().min(1, "Name is required").max(200),
  category: z.string().min(1, "Category is required"),
  subscription_type: z.string().min(1, "Type is required"),
  status: z.string().min(1, "Status is required"),
  quantity: z.coerce.number().int().min(1, "Minimum 1"),
  unit_cost: z.coerce.number().min(0, "Must be 0 or more"),
  currency: z.string().min(1),
  purchase_date: z.string().min(1, "Purchase date is required"),
  contract_start_date: z.string().optional(),
  contract_end_date: z.string().optional(),
  vendor_id: z.string().optional(),
  department: z.string().optional(),
  owner_name: z.string().optional(),
  owner_id: z.string().optional(),
  contract_number: z.string().optional(),
  renewal_alert_days: z.coerce.number().int().min(0).default(30),
  auto_renew: z.boolean().default(false),
  notes: z.string().max(2000, "Notes must be under 2000 characters").optional(),
}).refine((values) => {
  if (!values.contract_start_date || !values.contract_end_date) return true;
  return values.contract_end_date >= values.contract_start_date;
}, {
  message: "Contract end must be after contract start",
  path: ["contract_end_date"],
});

type FormValues = z.infer<typeof formSchema>;

interface SubscriptionTool {
  id: string;
  tool_name: string;
  category: string | null;
  subscription_type: string | null;
  quantity: number | null;
  unit_cost: number | null;
  currency: string | null;
  vendor_id: string | null;
  department: string | null;
  purchase_date: string | null;
  renewal_date: string | null;
  next_payment_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  status: string | null;
  renewal_alert_days: number | null;
  auto_renew: boolean | null;
  license_count: number | null;
  total_cost: number | null;
  notes: string | null;
  owner_name: string | null;
  owner_email: string | null;
  contract_number: string | null;
  payment_terms: string | null;
  website_url: string | null;
}

interface AddToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingTool?: SubscriptionTool | null;
}


const getDefaultValues = (): FormValues => ({
  tool_name: "",
  category: "",
  subscription_type: "",
  status: "",
  quantity: 1,
  unit_cost: 0,
  currency: "INR",
  purchase_date: new Date().toISOString().split("T")[0],
  contract_start_date: "",
  contract_end_date: "",
  vendor_id: "",
  department: "",
  owner_name: "",
  owner_id: "",
  contract_number: "",
  renewal_alert_days: 30,
  auto_renew: false,
  notes: "",
});

export const AddToolDialog = ({ open, onOpenChange, onSuccess, editingTool }: AddToolDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [customDepartments, setCustomDepartments] = useState<string[]>([]);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);

  const { data: vendors } = useQuery({
    queryKey: ["subscriptions-vendors"],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions_vendors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useUsers();

  const allDepartments = useMemo(() => {
    const combined = new Set<string>([...DEPARTMENTS, ...customDepartments]);
    return Array.from(combined).sort();
  }, [customDepartments]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  const watchName = form.watch("tool_name");
  const watchCategory = form.watch("category");
  const watchType = form.watch("subscription_type");
  const watchStatus = form.watch("status");
  const watchQuantity = form.watch("quantity");
  const watchUnitCost = form.watch("unit_cost");
  const watchCurrency = form.watch("currency");
  const watchPurchaseDate = form.watch("purchase_date");

  const rules = useMemo(
    () => getSubscriptionFieldRules(watchCategory, watchType, watchStatus),
    [watchCategory, watchType, watchStatus],
  );

  // Next Payment is always auto-synced from renewal_date for recurring types - no separate field

  const totalCost = useMemo(() => (watchQuantity || 0) * (watchUnitCost || 0), [watchQuantity, watchUnitCost]);
  const currencySymbol = CURRENCY_SYMBOLS[watchCurrency] || "₹";
  const isEditing = Boolean(editingTool);
  const showDetailFields = isEditing || (Boolean(watchName?.trim()) && rules.isConfigured);

  useEffect(() => {
    if (!open) return;
    if (editingTool) {
      // Find the owner user by name to resolve UUID
      const ownerUser = users?.find(u => u.name === editingTool.owner_name || u.email === editingTool.owner_name);
      form.reset({
        tool_name: editingTool.tool_name || "",
        category: editingTool.category || "",
        subscription_type: editingTool.subscription_type || "",
        status: editingTool.status || "active",
        quantity: editingTool.quantity || 1,
        unit_cost: editingTool.unit_cost || 0,
        currency: editingTool.currency || "INR",
        purchase_date: editingTool.purchase_date || new Date().toISOString().split("T")[0],
        contract_start_date: editingTool.contract_start_date || "",
        contract_end_date: editingTool.contract_end_date || "",
        vendor_id: editingTool.vendor_id || "",
        department: editingTool.department || "",
        owner_name: editingTool.owner_name || "",
        owner_id: ownerUser?.id || "",
        contract_number: editingTool.contract_number || "",
        renewal_alert_days: editingTool.renewal_alert_days || 30,
        auto_renew: Boolean(editingTool.auto_renew),
        notes: editingTool.notes || "",
      });
      return;
    }
    form.reset(getDefaultValues());
  }, [editingTool, form, open]);

  useEffect(() => {
    if (!showDetailFields) return;
    if (!rules.showContractDates) {
      form.setValue("contract_start_date", "", { shouldDirty: true, shouldValidate: false });
      form.setValue("contract_end_date", "", { shouldDirty: true, shouldValidate: false });
    }
    if (!rules.showContractNumber) {
      form.setValue("contract_number", "", { shouldDirty: true, shouldValidate: false });
    }
  }, [form, rules, showDetailFields]);

  // Auto-correct alert days when subscription type changes
  useEffect(() => {
    const { alertOptions, defaultAlertDays } = getCycleThresholds(watchType);
    const currentAlert = form.getValues("renewal_alert_days");
    const validValues = alertOptions.map(o => o.value);
    if (!validValues.includes(currentAlert)) {
      form.setValue("renewal_alert_days", defaultAlertDays, { shouldDirty: true });
    }
  }, [watchType, form]);

  const watchOwnerId = form.watch("owner_id");
  const selectedOwner = useMemo(() => {
    if (watchOwnerId) return users?.find(u => u.id === watchOwnerId);
    const ownerName = form.watch("owner_name");
    return users?.find(u => u.name === ownerName || u.email === ownerName);
  }, [users, watchOwnerId, form.watch("owner_name")]);

  // Assigned users for this subscription (edit mode only)
  const { data: assignedLicenses = [], refetch: refetchAssigned } = useQuery({
    queryKey: ["subscription-assigned-users", editingTool?.id],
    enabled: !!editingTool?.id && open,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions_licenses")
        .select("id, assigned_to, assigned_to_name, assigned_to_email, status")
        .eq("tool_id", editingTool!.id)
        .eq("status", "assigned");
      if (error) throw error;
      return data || [];
    },
  });

  const [assignUserOpen, setAssignUserOpen] = useState(false);

  const handleAssignUser = useCallback(async (userId: string) => {
    const user = users?.find(u => u.id === userId);
    if (!user || !editingTool?.id) return;
    // Check if already assigned
    if (assignedLicenses.some(l => l.assigned_to === userId)) {
      toast({ title: "Already assigned", description: `${user.name || user.email} already has a seat`, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("subscriptions_licenses").insert({
      tool_id: editingTool.id,
      assigned_to: userId,
      assigned_to_name: user.name || null,
      assigned_to_email: user.email || null,
      status: "assigned",
      assigned_at: new Date().toISOString().split("T")[0],
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      refetchAssigned();
      // Update quantity to match
      const newCount = assignedLicenses.length + 1;
      const currentQty = form.getValues("quantity");
      if (newCount > currentQty) form.setValue("quantity", newCount);
    }
    setAssignUserOpen(false);
  }, [users, editingTool, assignedLicenses, toast, refetchAssigned, form]);

  const handleUnassignUser = useCallback(async (licenseId: string) => {
    const { error } = await supabase.from("subscriptions_licenses").delete().eq("id", licenseId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      refetchAssigned();
    }
  }, [toast, refetchAssigned]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const currentRules = getSubscriptionFieldRules(values.category, values.subscription_type, values.status);
      const computedTotal = (values.quantity || 0) * (values.unit_cost || 0);

      // Resolve owner from UUID or name fallback
      const ownerUser = values.owner_id
        ? users?.find(u => u.id === values.owner_id)
        : users?.find(u => u.name === values.owner_name || u.email === values.owner_name);

      // Auto-calculate renewal_date and next_payment_date from purchase_date + type
      const calculatedRenewal = computeRenewalDate(values.purchase_date, values.subscription_type);

      // Compute effective status from manual status + calculated renewal date
      const effectiveStatus = computeEffectiveStatus(
        values.status,
        calculatedRenewal,
        values.subscription_type
      );

      const payload = {
        tool_name: values.tool_name.trim(),
        category: values.category,
        subscription_type: values.subscription_type,
        status: effectiveStatus,
        quantity: values.quantity,
        unit_cost: values.unit_cost,
        currency: values.currency,
        total_cost: computedTotal,
        license_count: values.quantity,
        purchase_date: values.purchase_date || null,
        renewal_date: calculatedRenewal,
        next_payment_date: calculatedRenewal,
        contract_start_date: currentRules.showContractDates ? values.contract_start_date || null : null,
        contract_end_date: currentRules.showContractDates ? values.contract_end_date || null : null,
        vendor_id: values.vendor_id || null,
        department: values.department?.trim() || null,
        owner_name: ownerUser?.name || values.owner_name?.trim() || null,
        owner_email: ownerUser?.email || null,
        contract_number: currentRules.showContractNumber ? values.contract_number?.trim() || null : null,
        payment_terms: null,
        renewal_alert_days: currentRules.showRenewalSettings ? values.renewal_alert_days : null,
        auto_renew: currentRules.showRenewalSettings ? values.auto_renew : false,
        website_url: editingTool?.website_url ?? null,
        notes: values.notes?.trim() || null,
      };

      const { error } = editingTool
        ? await supabase.from("subscriptions_tools").update(payload).eq("id", editingTool.id)
        : await supabase.from("subscriptions_tools").insert(payload);

      if (error) throw error;

      toast({
        title: "Success",
        description: editingTool ? "Subscription updated" : "Subscription added",
      });
      ALL_TOOL_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [...key] }));
      form.reset(getDefaultValues());
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Operation failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base">{editingTool ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="tool_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Microsoft 365, AWS, Firewall" className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subscription_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUBSCRIPTION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
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
                      <FormLabel className="text-xs">Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {USER_SELECTABLE_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showDetailFields && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
                  {/* Pricing row */}
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="unit_cost"
                      render={({ field: costField }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Unit Cost *</FormLabel>
                          <div className="flex overflow-hidden rounded-md border border-input bg-background shadow-sm transition-colors duration-[var(--transition-base)] focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
                            <FormField
                              control={form.control}
                              name="currency"
                              render={({ field: currencyField }) => (
                                <Select onValueChange={currencyField.onChange} value={currencyField.value}>
                                  <SelectTrigger className="h-8 w-[88px] rounded-none border-0 border-r px-2 text-xs shadow-none focus:ring-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CURRENCIES.map((currency) => (
                                      <SelectItem key={currency} value={currency} className="text-xs">
                                        {CURRENCY_SYMBOLS[currency]} {currency}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                className="h-8 rounded-none border-0 shadow-none focus-visible:ring-0"
                                {...costField}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{rules.quantityLabel}</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} className="h-8 text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel className="text-xs">Total</FormLabel>
                      <div className="flex h-8 items-center rounded-md border bg-muted/50 px-3 text-sm font-semibold tabular-nums">
                        {formatCost(totalCost, watchCurrency)}
                      </div>
                    </FormItem>
                  </div>

                  {/* Assigned Users Section — edit mode only */}
                  {isEditing && editingTool?.id && (
                    <Collapsible defaultOpen={assignedLicenses.length > 0}>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" className="w-full justify-between h-8 px-2 text-xs font-medium">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Assigned Users ({assignedLicenses.length})
                          </span>
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pt-1">
                        {assignedLicenses.length > 0 && (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {assignedLicenses.map((lic) => (
                              <div key={lic.id} className="flex items-center justify-between px-2 py-1 rounded border bg-muted/30 text-sm">
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate text-xs font-medium">{lic.assigned_to_name || lic.assigned_to_email || "—"}</span>
                                  {lic.assigned_to_name && lic.assigned_to_email && (
                                    <span className="text-[10px] text-muted-foreground truncate">{lic.assigned_to_email}</span>
                                  )}
                                </div>
                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => handleUnassignUser(lic.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <Popover open={assignUserOpen} onOpenChange={setAssignUserOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="w-full h-7 text-xs gap-1">
                              <Plus className="h-3 w-3" /> Assign User
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[320px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search users..." className="h-8 text-sm" />
                              <CommandList>
                                <CommandEmpty>No users found.</CommandEmpty>
                                <CommandGroup>
                                  {users?.filter(u => !assignedLicenses.some(l => l.assigned_to === u.id)).map((u) => (
                                    <CommandItem key={u.id} value={`${u.name || ""} ${u.email}`} onSelect={() => handleAssignUser(u.id)} className="cursor-pointer text-sm">
                                      <div className="flex flex-col">
                                        <span>{u.name || "—"}</span>
                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Purchase Date - always shown */}
                  {rules.showPurchaseDate && (
                    <FormField
                      control={form.control}
                      name="purchase_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Purchase Date *</FormLabel>
                          <FormControl>
                            <Input type="date" className="h-8 text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Auto-renew & Alert - always visible when configured */}
                  {rules.showRenewalSettings && (
                    <div className="flex items-center gap-4">
                      <FormField
                        control={form.control}
                        name="auto_renew"
                        render={({ field }) => (
                          <div className="flex items-center gap-1.5">
                            <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-[0.7]" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Auto-renew</span>
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="renewal_alert_days"
                        render={({ field }) => (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Alert</span>
                            <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={String(field.value)}>
                              <SelectTrigger className="h-7 w-[120px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getCycleThresholds(watchType).alertOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      />
                    </div>
                  )}

                  {/* Effective status hint based on auto-calculated renewal */}
                  {(() => {
                    const calculatedRenewal = computeRenewalDate(watchPurchaseDate, watchType);
                    const effective = computeEffectiveStatus(watchStatus, calculatedRenewal, watchType);
                    if (effective !== watchStatus && calculatedRenewal) {
                      return (
                        <div className="flex items-center gap-1.5 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive/70" />
                          <span className="text-muted-foreground">Will display as:</span>
                          <Badge variant={effective === "expired" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {effective === "expiring_soon" ? "Expiring Soon" : effective === "expired" ? "Expired" : effective}
                          </Badge>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Contract dates */}
                  {rules.showDatesSection && rules.showContractDates && (
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="contract_start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Contract Start</FormLabel>
                            <FormControl>
                              <Input type="date" className="h-8 text-sm" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contract_end_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Contract End</FormLabel>
                            <FormControl>
                              <Input type="date" className="h-8 text-sm" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Assignment fields - no section header */}
                  {rules.showAssignmentSection && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="vendor_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Vendor</FormLabel>
                              <div className="flex gap-1">
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Select vendor" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {vendors?.map((vendor) => (
                                      <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setAddVendorOpen(true)}>
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Department</FormLabel>
                              <div className="flex gap-1">
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {allDepartments.map((dept) => (
                                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Popover open={addDeptOpen} onOpenChange={setAddDeptOpen}>
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0">
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 p-2" align="end">
                                    <div className="flex gap-1">
                                      <Input
                                        placeholder="New department"
                                        className="h-7 text-xs"
                                        value={newDeptName}
                                        onChange={(e) => setNewDeptName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && newDeptName.trim()) {
                                            e.preventDefault();
                                            setCustomDepartments(prev => [...prev, newDeptName.trim()]);
                                            field.onChange(newDeptName.trim());
                                            setNewDeptName("");
                                            setAddDeptOpen(false);
                                          }
                                        }}
                                      />
                                      <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => {
                                        if (newDeptName.trim()) {
                                          setCustomDepartments(prev => [...prev, newDeptName.trim()]);
                                          field.onChange(newDeptName.trim());
                                          setNewDeptName("");
                                          setAddDeptOpen(false);
                                        }
                                      }}>Add</Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="owner_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Owner</FormLabel>
                              <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button type="button" variant="outline" role="combobox" className={cn("h-8 w-full justify-between text-sm font-normal", !selectedOwner && !field.value && "text-muted-foreground")}>
                                      <span className="truncate">{selectedOwner ? (selectedOwner.name || selectedOwner.email) : field.value || "Select owner"}</span>
                                      <Search className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search users..." className="h-8 text-sm" />
                                    <CommandList>
                                      <CommandEmpty>No users found.</CommandEmpty>
                                      <CommandGroup>
                                        {users?.map((u) => (
                                          <CommandItem key={u.id} value={`${u.name || ""} ${u.email}`} onSelect={() => {
                                            form.setValue("owner_id", u.id);
                                            field.onChange(u.name || u.email);
                                            setOwnerPopoverOpen(false);
                                          }} className="text-sm">
                                            <div className="flex flex-col">
                                              <span>{u.name || u.email}</span>
                                              {u.name && <span className="text-xs text-muted-foreground">{u.email}</span>}
                                            </div>
                                            <Check className={cn("ml-auto h-3.5 w-3.5", watchOwnerId === u.id ? "opacity-100" : "opacity-0")} />
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </FormItem>
                          )}
                        />

                        {rules.showContractNumber && (
                          <FormField
                            control={form.control}
                            name="contract_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Contract #</FormLabel>
                                <FormControl>
                                  <Input placeholder="CNT-2024-001" className="h-8 text-sm" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes - inline, no collapsible */}
                  {rules.isConfigured && (
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Short notes, vendor context, support terms..." rows={2} className="min-h-[48px] text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              <DialogFooter className="pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingTool ? "Save Changes" : "Add Subscription"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AddVendorDialog
        open={addVendorOpen}
        onOpenChange={setAddVendorOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["subscriptions-vendors"] })}
      />
    </>
  );
};
