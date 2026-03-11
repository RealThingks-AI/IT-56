import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Edit, Calendar, Users, Globe, FileText, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddToolDialog } from "@/components/Subscriptions/AddToolDialog";
import { AddLicenseDialog } from "@/components/Subscriptions/AddLicenseDialog";
import { AddPaymentDialog } from "@/components/Subscriptions/AddPaymentDialog";
import { useToast } from "@/hooks/use-toast";
import {
  formatCost,
  formatSubscriptionTypeLabel,
  getDaysUntilRenewal,
  getMonthlyEquivalent,
  getRenewalUrgency,
  getSubscriptionFieldRules,
} from "@/lib/subscriptions/subscriptionUtils";

const formatDateValue = (date?: string | null) => date ? format(new Date(date), "MMM d, yyyy") : "—";

const SubscriptionDetail = () => {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddLicenseOpen, setIsAddLicenseOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["subscription-detail", subscriptionId],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions_tools")
        .select("*, subscriptions_vendors(*)")
        .eq("id", subscriptionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!subscriptionId,
  });

  const { data: licenses = [], refetch: refetchLicenses } = useQuery({
    queryKey: ["subscription-licenses", subscriptionId],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions_licenses")
        .select("*")
        .eq("tool_id", subscriptionId);
      return data || [];
    },
    enabled: !!subscriptionId,
  });

  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ["subscription-payments", subscriptionId],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions_payments")
        .select("*")
        .eq("tool_id", subscriptionId)
        .order("payment_date", { ascending: false });
      return data || [];
    },
    enabled: !!subscriptionId,
  });

  // Load existing notes when subscription data arrives
  useEffect(() => {
    if (subscription?.notes !== undefined) {
      setNotesValue(subscription.notes || "");
    }
  }, [subscription?.notes]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase
      .from("subscriptions_tools")
      .update({ notes: notesValue })
      .eq("id", subscriptionId);

    if (error) {
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Notes updated" });
      setEditingNotes(false);
      refetch();
    }
    setSavingNotes(false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-4 gap-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-4 shrink-0">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-32" /></div>
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-2 gap-4 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="h-full flex items-center justify-center animate-in fade-in duration-300">
        <div className="text-center">
          <p className="text-muted-foreground">Subscription not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/subscription/tools")}>Back to list</Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default" as const;
      case "expiring_soon": return "secondary" as const;
      case "expired": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  const rules = getSubscriptionFieldRules(subscription.category, subscription.subscription_type, subscription.status);
  const renewalDays = getDaysUntilRenewal(subscription.renewal_date);
  const renewalUrgency = renewalDays !== null ? getRenewalUrgency(renewalDays, subscription.subscription_type) : null;
  const seatCount = subscription.quantity || subscription.license_count || 0;
  const usedSeats = licenses.filter((license: any) => license.status === "assigned").length;
  const utilizationPercent = seatCount > 0 ? Math.round((usedSeats / seatCount) * 100) : 0;
  const totalPayments = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
  const paymentCurrency = payments.length > 0 ? (payments[0] as any).currency || subscription.currency || "INR" : subscription.currency || "INR";
  const totalCost = Number(subscription.total_cost || 0);
  const monthlyEquiv = getMonthlyEquivalent(totalCost, subscription.subscription_type);
  const dateRows = [
    rules.showRenewalDate ? { label: rules.renewalDateLabel, value: subscription.renewal_date, pill: renewalDays !== null && renewalUrgency ? { text: `${renewalDays}d`, variant: renewalUrgency === "critical" ? "destructive" : "secondary" as const } : null } : null,
    rules.showNextPaymentDate ? { label: "Next Payment", value: subscription.next_payment_date } : null,
    rules.showContractDates ? { label: "Contract Start", value: subscription.contract_start_date } : null,
    rules.showContractDates ? { label: "Contract End", value: subscription.contract_end_date } : null,
  ].filter(Boolean) as Array<{ label: string; value: string | null; pill?: { text: string; variant: "secondary" | "destructive" } | null }>;

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-300">
      <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{subscription.tool_name}</h1>
              <Badge variant={getStatusColor(subscription.status || "active")} className="capitalize">
                {(subscription.status || "active").replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {(subscription.subscriptions_vendors as { name?: string } | null)?.name || "No vendor"} • {subscription.category || "Uncategorized"}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsEditOpen(true)} size="sm">
          <Edit className="h-4 w-4 mr-2" /> Edit
        </Button>
      </div>

      <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col px-4 pb-4">
        <TabsList className="shrink-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="licenses">Licenses ({licenses.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 min-h-0 mt-3">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Subscription Info</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{subscription.tool_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{subscription.category || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{formatSubscriptionTypeLabel(subscription.subscription_type)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span>{(subscription.subscriptions_vendors as { name?: string } | null)?.name || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{subscription.department || "—"}</span></div>
                  {subscription.contract_number && <div className="flex justify-between"><span className="text-muted-foreground">Contract #</span><span>{subscription.contract_number}</span></div>}
                  {subscription.payment_terms && <div className="flex justify-between"><span className="text-muted-foreground">Payment Terms</span><span className="capitalize">{subscription.payment_terms.replace("_", " ")}</span></div>}
                  {subscription.website_url && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Website</span>
                      <a href={subscription.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Visit
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Unit Cost</span><span className="font-medium">{formatCost(subscription.unit_cost, subscription.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{rules.quantityLabel}</span><span>{subscription.quantity || 1}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Cost</span><span className="font-semibold">{formatCost(subscription.total_cost, subscription.currency)}</span></div>
                  {!["owned", "one_time"].includes(subscription.subscription_type || "") ? (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Monthly Equiv.</span><span>{formatCost(monthlyEquiv, subscription.currency)}/mo</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Annual Equiv.</span><span>{formatCost(monthlyEquiv * 12, subscription.currency)}/yr</span></div>
                    </>
                  ) : (
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-xs text-muted-foreground">One-time cost</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{subscription.currency || "INR"}</span></div>
                  {subscription.auto_renew && <Badge variant="secondary" className="text-xs">Auto-renew</Badge>}
                </CardContent>
              </Card>

              {dateRows.length > 0 && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Dates</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {dateRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          <Calendar className="mr-1 inline h-3.5 w-3.5" />{row.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{formatDateValue(row.value)}</span>
                          {row.pill && <Badge variant={row.pill.variant} className="text-xs">{row.pill.text}</Badge>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {seatCount > 0 && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />License Usage</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Seats</span><span className="font-medium">{seatCount}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Used</span><span>{usedSeats}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Available</span><span>{seatCount - usedSeats}</span></div>
                    {seatCount > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span>Utilization</span><span>{utilizationPercent}%</span></div>
                        <Progress value={utilizationPercent} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(subscription.owner_name || subscription.owner_email) && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Owner</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {subscription.owner_name && <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{subscription.owner_name}</span></div>}
                    {subscription.owner_email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{subscription.owner_email}</span></div>}
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="licenses" className="flex-1 min-h-0 mt-3">
          <ScrollArea className="h-full">
            <div className="space-y-3 pb-2">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setIsAddLicenseOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add License
                </Button>
              </div>
              {seatCount > 0 && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
                  <span>{usedSeats} / {seatCount} seats used</span>
                  <Progress value={utilizationPercent} className="h-2 flex-1 max-w-xs" />
                  <span className="text-muted-foreground">{utilizationPercent}%</span>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-9">USER / KEY</TableHead>
                      <TableHead className="text-xs h-9">STATUS</TableHead>
                      <TableHead className="text-xs h-9">ASSIGNED</TableHead>
                      <TableHead className="text-xs h-9">EXPIRES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No licenses assigned yet</TableCell>
                      </TableRow>
                    ) : licenses.map((license: any) => (
                      <TableRow key={license.id} className="transition-colors">
                        <TableCell className="text-sm py-2">{license.assigned_to_name || license.assigned_to_email || license.license_key || "—"}</TableCell>
                        <TableCell className="py-2"><Badge variant={license.status === "assigned" ? "default" : "secondary"} className="text-xs">{license.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2">{license.assigned_at ? format(new Date(license.assigned_at), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2">{license.expires_at ? format(new Date(license.expires_at), "MMM d, yyyy") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="payments" className="flex-1 min-h-0 mt-3">
          <ScrollArea className="h-full">
            <div className="space-y-3 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Total Paid: <strong>{formatCost(totalPayments, paymentCurrency)}</strong></span>
                </div>
                <Button size="sm" onClick={() => setIsAddPaymentOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Payment
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-9">DATE</TableHead>
                      <TableHead className="text-xs h-9">AMOUNT</TableHead>
                      <TableHead className="text-xs h-9">STATUS</TableHead>
                      <TableHead className="text-xs h-9">METHOD</TableHead>
                      <TableHead className="text-xs h-9">INVOICE #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payments recorded</TableCell>
                      </TableRow>
                    ) : payments.map((payment: any) => (
                      <TableRow key={payment.id} className="transition-colors">
                        <TableCell className="text-xs py-2">{payment.payment_date ? format(new Date(payment.payment_date), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="text-sm font-medium py-2">{formatCost(payment.amount, payment.currency)}</TableCell>
                        <TableCell className="py-2"><Badge variant={payment.status === "paid" ? "default" : "secondary"} className="text-xs">{payment.status}</Badge></TableCell>
                        <TableCell className="text-xs capitalize py-2">{payment.payment_method?.replace("_", " ") || "—"}</TableCell>
                        <TableCell className="text-xs py-2">{payment.invoice_number || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 min-h-0 mt-3">
          <ScrollArea className="h-full">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Notes</h4>
                    {!editingNotes ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => { setEditingNotes(true); setNotesValue(subscription.notes || ""); }}
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingNotes(false)}>Cancel</Button>
                        <Button size="sm" className="h-7 gap-1 text-xs" onClick={handleSaveNotes} disabled={savingNotes}>
                          <Save className="h-3 w-3" /> {savingNotes ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingNotes ? (
                    <Textarea value={notesValue} onChange={(event) => setNotesValue(event.target.value)} className="min-h-[120px]" placeholder="Add notes..." />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{subscription.notes || "No notes added."}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <AddToolDialog open={isEditOpen} onOpenChange={setIsEditOpen} onSuccess={() => { refetch(); setIsEditOpen(false); }} editingTool={subscription as any} />
      <AddLicenseDialog open={isAddLicenseOpen} onOpenChange={setIsAddLicenseOpen} onSuccess={() => { refetchLicenses(); setIsAddLicenseOpen(false); }} editingLicense={null} defaultToolId={subscriptionId} />
      <AddPaymentDialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen} onSuccess={() => { refetchPayments(); setIsAddPaymentOpen(false); }} editingPayment={null} defaultToolId={subscriptionId} />
    </div>
  );
};

export default SubscriptionDetail;
