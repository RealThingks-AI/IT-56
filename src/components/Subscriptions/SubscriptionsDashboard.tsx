import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, AlertTriangle } from "lucide-react";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { format } from "date-fns";
import { formatINR } from "@/lib/currencyConversion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const SubscriptionsDashboard = () => {
  const { organisation } = useOrganisation();
  const queryClient = useQueryClient();

  const { data: tools, isLoading: toolsLoading } = useQuery({
    queryKey: ["subscriptions-tools", organisation?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions_tools")
        .select("*, subscriptions_vendors(name)")
        .eq("organisation_id", organisation?.id!);
      
      if (error) throw error;
      return data;
    },
    enabled: !!organisation?.id,
  });

  // Real-time subscription for tools
  useEffect(() => {
    if (!organisation?.id) return;

    const channel = supabase
      .channel('subscriptions-tools-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions_tools',
          filter: `organisation_id=eq.${organisation.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["subscriptions-tools", organisation.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organisation?.id, queryClient]);

  // Calculate monthly burn rate
  const monthlyBurnRate = tools
    ?.filter(t => t.status === "active")
    .reduce((sum, tool) => {
      const licenseCount = tool.license_count || 1;
      const cost = Number(tool.total_cost || 0) * licenseCount;
      return sum + cost;
    }, 0) || 0;

  // Calculate upcoming renewals
  const upcomingRenewals = tools
    ?.filter(t => {
      if (!t.renewal_date || t.status !== "active") return false;
      const daysUntil = Math.ceil((new Date(t.renewal_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 30;
    })
    .map(t => ({
      tool_id: t.id,
      tool_name: t.tool_name,
      vendor_name: (t.subscriptions_vendors as any)?.name || "No vendor",
      renewal_date: t.renewal_date,
      days_until_renewal: Math.ceil((new Date(t.renewal_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      cost: Number(t.total_cost || 0) * (t.license_count || 1),
      status: t.status,
    }))
    .sort((a, b) => a.days_until_renewal - b.days_until_renewal) || [];

  const activeTools = tools?.filter(t => t.status === "active") || [];
  const expiringSoon = upcomingRenewals.filter(r => r.days_until_renewal <= 7);

  const annualCost = monthlyBurnRate * 12;

  if (toolsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (!tools || tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
        <div className="rounded-full bg-muted p-4 mb-3">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold mb-1">No subscriptions found</h3>
        <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
          Get started by adding your first subscription tool
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics Summary Bar */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-medium">{activeTools.length} Active Tools</div>
            <div className="text-xs text-muted-foreground">
              {tools?.filter(t => t.status === "trial").length || 0} in trial
            </div>
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <div className="text-sm font-medium">{formatINR(monthlyBurnRate)}/mo</div>
          <div className="text-xs text-muted-foreground">{formatINR(annualCost)}/yr</div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <div>
            <div className="text-sm font-medium">{upcomingRenewals.length} Renewals</div>
            <div className="text-xs text-muted-foreground">Next 30 days</div>
          </div>
        </div>
        {expiringSoon.length > 0 && (
          <>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-sm font-medium text-orange-600">{expiringSoon.length} Expiring</div>
                <div className="text-xs text-muted-foreground">Within 7 days</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Upcoming Renewals Table */}
      {upcomingRenewals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Upcoming Renewals (Next 30 Days)</h3>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium h-9">TOOL NAME</TableHead>
                  <TableHead className="text-xs font-medium h-9">VENDOR</TableHead>
                  <TableHead className="text-xs font-medium h-9">RENEWAL DATE</TableHead>
                  <TableHead className="text-xs font-medium h-9">DAYS LEFT</TableHead>
                  <TableHead className="text-xs font-medium h-9">COST</TableHead>
                  <TableHead className="text-xs font-medium h-9">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingRenewals.map((renewal: any) => (
                  <TableRow key={renewal.tool_id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-sm py-2">
                      {renewal.tool_name}
                    </TableCell>
                    <TableCell className="text-sm py-2">
                      {renewal.vendor_name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">
                      {format(new Date(renewal.renewal_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge 
                        variant={renewal.days_until_renewal <= 7 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {renewal.days_until_renewal}d
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium py-2">
                      {formatINR(renewal.cost)}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {renewal.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Cost Distribution by Type */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Package className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Cost Distribution</h3>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium h-9">BILLING CYCLE</TableHead>
                <TableHead className="text-xs font-medium h-9">TOOLS COUNT</TableHead>
                <TableHead className="text-xs font-medium h-9 text-right">TOTAL COST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {["monthly", "yearly", "per_user", "one_time"].map(type => {
                const typeTools = tools?.filter(t => t.billing_cycle === type && t.status === "active") || [];
                const typeCost = typeTools.reduce(
                  (sum, t) => sum + Number(t.total_cost || 0) * (t.license_count || 1), 
                  0
                );
                
                if (typeCost === 0) return null;

                return (
                  <TableRow key={type} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-sm capitalize py-2">
                      {type.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-sm py-2">
                      {typeTools.length}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-right py-2">
                      {formatINR(typeCost)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};