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
import { Edit, Trash2, Key, Users, Calendar, DollarSign, Building } from "lucide-react";

const LicenseDetail = () => {
  const { licenseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch license details
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

  // Fetch license allocations
  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: ["itam-license-allocations", licenseId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from("itam_license_allocations")
        .select("*") as any)
        .eq("license_id", licenseId)
        .eq("is_active", true)
        .order("allocated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!licenseId,
  });

  // Delete license mutation
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
    onError: () => {
      toast.error("Failed to delete license");
    },
  });

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!license) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-12">
          <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">License not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/assets/licenses")}>
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold">{license.name}</h1>
              <p className="text-sm text-muted-foreground">
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
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seats</p>
                  <p className="text-xl font-semibold">{seatsAllocated} / {seatsTotal}</p>
                </div>
              </div>
              <Progress value={utilization} className="mt-3 h-2" />
              <p className={`text-xs mt-1 ${getUtilizationColor(utilization)}`}>
                {utilization.toFixed(0)}% utilized
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expiry</p>
                  <p className="text-lg font-semibold">
                    {license.expiry_date
                      ? format(new Date(license.expiry_date), "MMM d, yyyy")
                      : "No expiry"}
                  </p>
                </div>
              </div>
              <Badge variant={expiryStatus.variant} className="mt-3">
                {expiryStatus.label}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cost</p>
                  <p className="text-xl font-semibold">
                    {license.cost ? `₹${license.cost.toLocaleString()}` : "—"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {license.license_type && `Type: ${license.license_type}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="text-lg font-semibold">
                    {license.itam_vendors?.name || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* License Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">License Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">License Key</span>
                  <span className="text-sm font-mono">
                    {license.license_key ? "••••••••" : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">License Type</span>
                  <span className="text-sm">{license.license_type || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Purchase Date</span>
                  <span className="text-sm">
                    {license.purchase_date
                      ? format(new Date(license.purchase_date), "MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Seats Available</span>
                  <span className="text-sm">{seatsTotal - seatsAllocated}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">License Type</span>
                  <span className="text-sm">{license.license_type || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {license.created_at
                      ? format(new Date(license.created_at), "MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
            {license.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm">{license.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allocations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Seat Allocations</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/assets/licenses/allocate?license=${licenseId}`)}
              disabled={seatsAllocated >= seatsTotal}
            >
              Allocate Seat
            </Button>
          </CardHeader>
          <CardContent>
            {allocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No allocations yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Allocated On</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation: any) => (
                    <TableRow key={allocation.id}>
                      <TableCell className="font-medium">
                        {allocation.users
                          ? `${allocation.users.first_name || ""} ${allocation.users.last_name || ""}`.trim() ||
                            allocation.users.email
                          : allocation.allocated_to || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {allocation.allocated_at
                          ? format(new Date(allocation.allocated_at), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
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
