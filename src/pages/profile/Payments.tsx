import { CreditCard, Receipt, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Payments = () => {
  const { user } = useAuth();
  const { organisation } = useOrganisation();
  const { isAdmin, accountType } = useRole();

  // Check if user has permission to view payments
  const hasAccess = accountType === 'personal' || isAdmin;

  return (
    <div className="py-4 space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-normal">Payments & Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription, payment methods, and billing history
        </p>
      </div>

      {/* Access Denied for non-admins in organization accounts */}
      {!hasAccess && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Access Denied</AlertTitle>
          <AlertDescription className="mt-2">
            You don't have permission to view billing information. Please contact your Organization Admin for billing access.
          </AlertDescription>
        </Alert>
      )}

      {/* Only show payment content if user has access */}
      {hasAccess && (
        <>
          {/* Current Subscription */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Subscription management is not yet configured for this organization.
                </p>
                <p className="text-sm text-muted-foreground">
                  Contact your administrator to set up billing.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-center py-8 text-muted-foreground">
                No payment methods configured. Add a payment method to enable automatic billing.
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-center py-8 text-muted-foreground">
                No payment history available
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Payments;