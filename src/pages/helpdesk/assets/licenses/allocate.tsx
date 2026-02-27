import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useUsers } from "@/hooks/useUsers";
import { getUserDisplayName } from "@/lib/userUtils";

const AllocateLicense = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Bug 2 fix: read "license" param instead of "licenseId"
  const [licenseId, setLicenseId] = useState(searchParams.get("license") || "");
  const [userId, setUserId] = useState("");
  const [assetId, setAssetId] = useState("");

  const { data: licenses = [] } = useQuery({
    queryKey: ["itam-licenses-available"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_licenses")
        .select("*")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: users = [] } = useUsers();

  const { data: assets = [] } = useQuery({
    queryKey: ["itam-assets-assigned", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("itam_assets")
        .select("*")
        .eq("assigned_to", userId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!userId,
  });

  const allocateLicense = useMutation({
    mutationFn: async () => {
      const selectedLicense = licenses.find(l => l.id === licenseId);
      if (!selectedLicense) throw new Error("License not found");

      if ((selectedLicense.seats_allocated || 0) >= (selectedLicense.seats_total || 0)) {
        throw new Error("No seats available for this license");
      }

      const { error: allocError } = await supabase.from("itam_license_allocations").insert({
        license_id: licenseId,
        asset_id: assetId || null,
        user_id: userId,
      });
      if (allocError) throw allocError;

      const { error: updateError } = await supabase
        .from("itam_licenses")
        .update({ seats_allocated: (selectedLicense.seats_allocated || 0) + 1 })
        .eq("id", licenseId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      // Bug 8 fix: invalidate correct query keys
      queryClient.invalidateQueries({ queryKey: ["itam-licenses-list"] });
      queryClient.invalidateQueries({ queryKey: ["itam-license-detail"] });
      queryClient.invalidateQueries({ queryKey: ["itam-license-allocations"] });
      toast.success("License allocated successfully");
      navigate("/assets/licenses");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to allocate license");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseId || !userId) {
      toast.error("Please select a license and user");
      return;
    }
    allocateLicense.mutate();
  };

  const selectedLicense = licenses.find(l => l.id === licenseId);
  const availableSeats = selectedLicense
    ? (selectedLicense.seats_total || 0) - (selectedLicense.seats_allocated || 0)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold">Allocate License</h1>
            <p className="text-xs text-muted-foreground">
              Assign a license seat to a user
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Allocation Details</CardTitle>
              <CardDescription className="text-xs">Select license, user, and optionally an asset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="license" className="text-xs">License *</Label>
                <Select value={licenseId} onValueChange={setLicenseId} required>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select license" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenses.map((license) => (
                      <SelectItem key={license.id} value={license.id}>
                        {license.name} ({license.seats_allocated || 0}/{license.seats_total || 0} seats used)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLicense && (
                  <p className="text-xs text-muted-foreground">
                    {availableSeats > 0 ? `${availableSeats} seats available` : "No seats available"}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user" className="text-xs">User *</Label>
                <Select value={userId} onValueChange={setUserId} required>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {getUserDisplayName(user) || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {userId && assets.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="asset" className="text-xs">Asset (Optional)</Label>
                  <Select value={assetId} onValueChange={setAssetId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name} ({asset.asset_tag || asset.asset_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/assets/licenses")}
                  disabled={allocateLicense.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={allocateLicense.isPending || availableSeats === 0}
                >
                  {allocateLicense.isPending ? "Allocating..." : "Allocate License"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default AllocateLicense;
