import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AddLicense = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;

  const [formData, setFormData] = useState({
    name: "",
    cost: "",
    vendor_id: "",
    purchase_date: "",
    expiry_date: "",
    no_end_date: false,
    seats_total: "",
    license_key: "",
    is_software: false,
    notes: "",
  });

  const { data: existingLicense, isLoading: loadingLicense } = useQuery({
    queryKey: ["itam-license-detail", editId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_licenses")
        .select("*")
        .eq("id", editId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingLicense) {
      setFormData({
        name: existingLicense.name || "",
        cost: existingLicense.cost?.toString() || "",
        vendor_id: existingLicense.vendor_id || "",
        purchase_date: existingLicense.purchase_date || "",
        expiry_date: existingLicense.expiry_date || "",
        no_end_date: !existingLicense.expiry_date,
        seats_total: existingLicense.seats_total?.toString() || "",
        license_key: existingLicense.license_key || "",
        is_software: existingLicense.license_type === "software",
        notes: existingLicense.notes || "",
      });
    }
  }, [existingLicense]);

  const { data: vendors = [] } = useQuery({
    queryKey: ["itam-vendors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_vendors")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const goBack = () => navigate("/assets/advanced?tab=licenses");

  const saveLicense = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        vendor_id: data.vendor_id || null,
        purchase_date: data.purchase_date || null,
        seats_total: data.seats_total ? parseInt(data.seats_total) : 1,
        expiry_date: data.no_end_date ? null : (data.expiry_date || null),
        license_key: data.license_key || null,
        license_type: data.is_software ? "software" : "other",
        cost: data.cost ? parseFloat(data.cost) : null,
        notes: data.notes || null,
        is_active: true,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("itam_licenses")
          .update(payload)
          .eq("id", editId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("itam_licenses")
          .insert({ ...payload, seats_allocated: 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itam-licenses-list"] });
      queryClient.invalidateQueries({ queryKey: ["itam-license-detail", editId] });
      toast.success(isEditMode ? "License updated" : "License added");
      goBack();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save license");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.purchase_date) {
      toast.error("Please fill in required fields (License Title and Start Date)");
      return;
    }
    if (!formData.no_end_date && !formData.expiry_date) {
      toast.error("Please provide an End Date or check 'No end date'");
      return;
    }
    saveLicense.mutate(formData);
  };

  if (isEditMode && loadingLicense) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">License Details</CardTitle>
              <CardDescription className="text-xs">
                Enter the license information and seat allocation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* License Title */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">License Title *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Microsoft Office 365"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9"
                  required
                />
              </div>

              {/* Cost & Vendor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cost" className="text-xs">Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor_id" className="text-xs">Vendor</Label>
                  <Select
                    value={formData.vendor_id}
                    onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="purchase_date" className="text-xs">Start Date *</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expiry_date" className="text-xs">End Date {formData.no_end_date ? "" : "*"}</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="h-9"
                    disabled={formData.no_end_date}
                  />
                </div>
              </div>

              {/* No end date & Seats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="no_end_date"
                    checked={formData.no_end_date}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, no_end_date: checked === true, expiry_date: checked ? "" : formData.expiry_date })
                    }
                  />
                  <Label htmlFor="no_end_date" className="text-xs font-normal cursor-pointer">
                    No end date
                  </Label>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seats_total" className="text-xs">No. of Licenses</Label>
                  <Input
                    id="seats_total"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={formData.seats_total}
                    onChange={(e) => setFormData({ ...formData, seats_total: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>

              {/* License Key & Software checkbox */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="license_key" className="text-xs">License Key</Label>
                  <Input
                    id="license_key"
                    placeholder="XXXXX-XXXXX-XXXXX"
                    value={formData.license_key}
                    onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
                    className="h-9 font-mono text-xs"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-5">
                  <Checkbox
                    id="is_software"
                    checked={formData.is_software}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_software: checked === true })
                    }
                  />
                  <Label htmlFor="is_software" className="text-xs font-normal cursor-pointer">
                    Contract is for software
                  </Label>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional information..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goBack}
                  disabled={saveLicense.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saveLicense.isPending}>
                  {saveLicense.isPending
                    ? isEditMode ? "Saving..." : "Adding..."
                    : isEditMode ? "Save Changes" : "Add License"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default AddLicense;
