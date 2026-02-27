import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Calendar, Edit, ShieldCheck } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface WarrantyTabProps {
  asset: any;
}

export const WarrantyTab = ({ asset }: WarrantyTabProps) => {
  const navigate = useNavigate();

  const getExpiryWarning = (endDate: string | null) => {
    if (!endDate) return null;
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return { message: "Expired", color: "text-destructive" };
    if (days <= 30) return { message: `Expires in ${days} days`, color: "text-amber-600" };
    return null;
  };

  const warrantyExpiry = asset.warranty_expiry;
  const purchaseDate = asset.purchase_date;
  const expiryWarning = getExpiryWarning(warrantyExpiry);

  // Calculate warranty progress
  const getWarrantyProgress = () => {
    if (!purchaseDate || !warrantyExpiry) return null;
    const start = new Date(purchaseDate).getTime();
    const end = new Date(warrantyExpiry).getTime();
    const now = Date.now();
    const total = end - start;
    if (total <= 0) return null;
    const elapsed = now - start;
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const remainingDays = differenceInDays(new Date(warrantyExpiry), new Date());
    return { pct, remainingDays };
  };

  const warrantyProgress = getWarrantyProgress();

  const customFields = asset.custom_fields as Record<string, any> | null;
  const leaseStartDate = customFields?.lease_start_date;
  const leaseExpiry = customFields?.lease_expiry;
  const leaseExpiryWarning = getExpiryWarning(leaseExpiry);

  return (
    <div className="space-y-4">
      {/* Warranty Information */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Warranty Information
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/assets/add?edit=${asset.id}`)}
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Edit Warranty
              </Button>
            </div>

            {/* Warranty Progress Bar */}
            {warrantyProgress && (
              <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Warranty Coverage</span>
                  <span className={`font-medium ${warrantyProgress.remainingDays < 0 ? 'text-destructive' : warrantyProgress.remainingDays <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                    {warrantyProgress.remainingDays < 0
                      ? `Expired ${Math.abs(warrantyProgress.remainingDays)} days ago`
                      : warrantyProgress.remainingDays <= 365
                        ? `${warrantyProgress.remainingDays} days remaining`
                        : `${Math.floor(warrantyProgress.remainingDays / 365)}y ${warrantyProgress.remainingDays % 365}d remaining`
                    }
                  </span>
                </div>
                <Progress value={warrantyProgress.pct} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{purchaseDate ? format(new Date(purchaseDate), "dd MMM yyyy") : ''}</span>
                  <span>{warrantyExpiry ? format(new Date(warrantyExpiry), "dd MMM yyyy") : ''}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Warranty Expiry</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {warrantyExpiry ? format(new Date(warrantyExpiry), "dd/MM/yyyy") : "Not set"}
                  </p>
                  {expiryWarning && (
                    <span className={`text-xs flex items-center gap-1 ${expiryWarning.color}`}>
                      <AlertTriangle className="h-3 w-3" />
                      {expiryWarning.message}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Purchase Date</p>
                <p className="text-sm font-medium">
                  {purchaseDate ? format(new Date(purchaseDate), "dd/MM/yyyy") : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendor</p>
                <p className="text-sm font-medium">{asset.vendor?.name || customFields?.vendor || "Not set"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Serial Number</p>
                <p className="text-sm font-medium font-mono">{asset.serial_number || "Not set"}</p>
              </div>
            </div>

            {!warrantyExpiry && (
              <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/50">
                No warranty information available. Click "Edit Warranty" to add details.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lease Information */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Lease Information
            </h3>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Lease Start Date</p>
                <p className="text-sm font-medium">
                  {leaseStartDate ? format(new Date(leaseStartDate), "dd/MM/yyyy") : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lease Expiry Date</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {leaseExpiry ? format(new Date(leaseExpiry), "dd/MM/yyyy") : "Not set"}
                  </p>
                  {leaseExpiryWarning && (
                    <span className={`text-xs flex items-center gap-1 ${leaseExpiryWarning.color}`}>
                      <AlertTriangle className="h-3 w-3" />
                      {leaseExpiryWarning.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!leaseStartDate && !leaseExpiry && (
              <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/50">
                No lease information available. Update the asset to add lease details.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
