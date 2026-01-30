import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, DollarSign, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

const SubscriptionDetail = () => {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription-detail", subscriptionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions_tools")
        .select("*, subscriptions_vendors(*)")
        .eq("id", subscriptionId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!subscriptionId,
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ["subscription-licenses", subscriptionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions_licenses")
        .select("*")
        .eq("tool_id", subscriptionId);
      return data || [];
    },
    enabled: !!subscriptionId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p>Loading subscription details...</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p>Subscription not found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "expiring_soon": return "bg-yellow-100 text-yellow-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{subscription.tool_name}</h1>
                <Badge className={getStatusColor(subscription.status || "active")}>
                  {subscription.status || "active"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {subscription.subscriptions_vendors?.name}
              </p>
            </div>
          </div>

          <Button onClick={() => navigate(`/subscription/edit/${subscription.id}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tool Name:</span>
                <span className="font-medium">{subscription.tool_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor:</span>
                <span className="font-medium">
                  {subscription.subscriptions_vendors?.name || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Renewal Date:
                </span>
                <span className="font-medium">
                  {subscription.renewal_date ? format(new Date(subscription.renewal_date), "MMM dd, yyyy") : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Cost per License:
                </span>
                <span className="font-medium">
                  ${subscription.cost_per_license || 0}/{subscription.billing_cycle === "monthly" ? "mo" : "yr"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>License Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  <Users className="h-4 w-4 inline mr-1" />
                  Total Seats:
                </span>
                <span className="font-medium">{subscription.license_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used:</span>
                <span className="font-medium">{licenses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available:</span>
                <span className="font-medium">
                  {(subscription.license_count || 0) - licenses.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Utilization:</span>
                <span className="font-medium">
                  {(subscription.license_count || 0) > 0 
                    ? Math.round((licenses.length / (subscription.license_count || 1)) * 100) 
                    : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Licenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {licenses.map((license: any) => (
                <div key={license.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">User ID: {license.user_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Assigned: {format(new Date(license.assigned_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <Badge variant={license.status === "assigned" ? "default" : "secondary"}>
                      {license.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {licenses.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No licenses assigned yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionDetail;
