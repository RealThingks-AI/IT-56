import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

const SubscriptionReports = () => {
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions_tools")
        .select("*, subscriptions_vendors(vendor_name)")
        .eq("status", "active");
      return data || [];
    },
  });

  const totalMonthlyCost = subscriptions.reduce((sum: number, sub: any) => {
    if (sub.subscription_type === "monthly") return sum + parseFloat(sub.cost);
    if (sub.subscription_type === "yearly") return sum + parseFloat(sub.cost) / 12;
    return sum;
  }, 0);

  const renewalsNext30Days = subscriptions.filter((sub: any) => {
    const renewalDate = new Date(sub.renewal_date);
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    return renewalDate >= today && renewalDate <= thirtyDaysFromNow;
  });

  const seatUtilization = subscriptions.map((sub: any) => ({
    tool: sub.tool_name,
    total: sub.license_count,
    used: 0, // Would need to count actual license assignments
    percentage: 0,
  })).sort((a, b) => b.percentage - a.percentage);

  const vendorSpend = subscriptions.reduce((acc: any, sub: any) => {
    const vendorName = sub.subscriptions_vendors?.vendor_name || "Unknown";
    if (!acc[vendorName]) {
      acc[vendorName] = 0;
    }
    const monthlyCost = sub.subscription_type === "yearly" 
      ? parseFloat(sub.cost) / 12 
      : parseFloat(sub.cost);
    acc[vendorName] += monthlyCost;
    return acc;
  }, {});

  const vendorSpendArray = Object.entries(vendorSpend)
    .map(([vendor, spend]: [string, any]) => ({
      vendor,
      spend: parseFloat(spend.toFixed(2)),
    }))
    .sort((a, b) => b.spend - a.spend);

  const handleExportReport = () => {
    const csv = [
      ["Subscription Report", format(new Date(), "yyyy-MM-dd")],
      [],
      ["Summary"],
      ["Total Monthly Cost", `$${totalMonthlyCost.toFixed(2)}`],
      ["Active Subscriptions", subscriptions.length],
      ["Renewals Next 30 Days", renewalsNext30Days.length],
      [],
      ["Vendor Spending"],
      ["Vendor", "Monthly Cost"],
      ...vendorSpendArray.map(v => [v.vendor, `$${v.spend}`]),
      [],
      ["Seat Utilization"],
      ["Tool", "Used", "Total", "Percentage"],
      ...seatUtilization.map(s => [s.tool, s.used, s.total, `${s.percentage}%`]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscription-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Report exported");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-2xl font-bold">Subscription Reports</h1>
          </div>

          <Button onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">${totalMonthlyCost.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Monthly Burn Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Calendar className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{renewalsNext30Days.length}</p>
                  <p className="text-sm text-muted-foreground">Renewals (30 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{subscriptions.length}</p>
                  <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vendorSpendArray.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded">
                    <span className="font-medium">{item.vendor}</span>
                    <span className="text-lg font-bold">${item.spend}/mo</span>
                  </div>
                ))}
                {vendorSpendArray.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seat Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seatUtilization.slice(0, 10).map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.tool}</span>
                      <span>{item.used}/{item.total} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {seatUtilization.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Renewals (Next 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {renewalsNext30Days.map((sub: any) => (
                  <div key={sub.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{sub.tool_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {sub.subscriptions_vendors?.vendor_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${sub.cost}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sub.renewal_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {renewalsNext30Days.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No renewals in the next 30 days
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionReports;
