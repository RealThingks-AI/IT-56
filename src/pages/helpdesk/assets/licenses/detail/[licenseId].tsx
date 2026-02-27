import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { Edit, Trash2, Key, Users, Calendar, DollarSign, Building, Eye, EyeOff, Copy } from "lucide-react";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$",
};

const LicenseDetail = () => {
  const { licenseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { settings } = useSystemSettings();
  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || settings.currency;

  const { data: license, isLoading } = useQuery({
    queryKey: ["itam-license-detail", licenseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_licenses")
        .select("*, itam_vendors(id, name)")
        .eq("id", licenseId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!licenseId,
  });

  // Fix Bug 3: use deallocated_at instead of is_active; join users for names
  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: ["itam-license-allocations", licenseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_license_allocations")
        .select("*, users:user_id(id, first_name, last_name, email)")
        .eq("license_id", licenseId!)
        .is("deallocated_at", null)
        .order("allocated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!licenseId,
  });

  const deleteLicense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("itam_licenses")
        .update({ is_active: false })
        .eq("id", licenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("License deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-licenses-list"] });
      navigate("/assets/licenses");
    },
    onError: () => toast.error("Failed to delete license"),
  });

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { label: "No Expiry", variant: "secondary" as const };
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return { label: "Expired", variant: "destructive" as const };
    if (daysUntilExpiry <= 30) return { label: "Expiring Soon", variant: "destructive" as const };
    if (daysUntilExpiry <= 90) return { label: "Expiring", variant: "outline" as const };
    return { label: "Active", variant: "default" as const };
  };

  const copyLicenseKey = () => {
    if (license?.license_key) {
      navigator.clipboard.writeText(license.license_key);
      toast.success("License key copied");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!license) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center py-12">
          <Key className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">License not found</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/assets/licenses")}>
            Back to Licenses
          </Button>
        </div>
      </div>
    );
  }

  const seatsTotal = license.seats_total || 1;
  const seatsAllocated = license.seats_allocated || 0;
  const utilization = (seatsAllocated / seatsTotal) * 100;
  const expiryStatus = getExpiryStatus(license.expiry_date);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-xl font-bold">{license.name}</h1>
              <p className="text-xs text-muted-foreground">
                {license.itam_vendors?.name || "No vendor"} • {license.license_type || "License"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/assets/licenses/add-license?edit=${licenseId}`)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Seats</p>
                  <p className="text-lg font-semibold">{seatsAllocated} / {seatsTotal}</p>
                </div>
              </div>
              <Progress value={utilization} className="mt-2.5 h-1.5" />
              <p className={`text-xs mt-1 ${getUtilizationColor(utilization)}`}>
                {utilization.toFixed(0)}% utilized
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expiry</p>
                  <p className="text-sm font-semibold">
                    {license.expiry_date
                      ? format(new Date(license.expiry_date), "MMM d, yyyy")
                      : "No expiry"}
                  </p>
                </div>
              </div>
              <Badge variant={expiryStatus.variant} className="mt-2.5 text-[11px]">
                {expiryStatus.label}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="text-lg font-semibold">
                    {license.cost ? `${currencySymbol}${license.cost.toLocaleString()}` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Building className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendor</p>
                  <p className="text-sm font-semibold">
                    {license.itam_vendors?.name || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* License Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">License Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <div className="space-y-0">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-xs text-muted-foreground">License Key</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono">
                      {license.license_key
                        ? showKey ? license.license_key : "••••••••••••"
                        : "—"}
                    </span>
                    {license.license_key && (
                      <>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowKey(!showKey)}>
                          {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={copyLicenseKey}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-xs text-muted-foreground">License Type</span>
                  <span className="text-xs">{license.license_type || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-xs text-muted-foreground">Purchase Date</span>
                  <span className="text-xs">
                    {license.purchase_date
                      ? format(new Date(license.purchase_date), "MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-0">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-xs text-muted-foreground">Seats Available</span>
                  <span className="text-xs">{seatsTotal - seatsAllocated}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge variant={expiryStatus.variant} className="text-[10px] h-5">
                    {expiryStatus.label}
                  </Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs">
                    {license.created_at
                      ? format(new Date(license.created_at), "MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
            {license.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-xs">{license.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allocations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Seat Allocations</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/assets/licenses/allocate?license=${licenseId}`)}
              disabled={seatsAllocated >= seatsTotal}
            >
              Allocate Seat
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {allocations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No allocations yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Allocated On</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation: any) => (
                    <TableRow key={allocation.id}>
                      <TableCell className="font-medium text-sm">
                        {allocation.users
                          ? `${allocation.users.first_name || ""} ${allocation.users.last_name || ""}`.trim() ||
                            allocation.users.email
                          : "Unknown"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {allocation.allocated_at
                          ? format(new Date(allocation.allocated_at), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {allocation.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => deleteLicense.mutate()}
        title="Delete License"
        description="Are you sure you want to delete this license? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

export default LicenseDetail;
