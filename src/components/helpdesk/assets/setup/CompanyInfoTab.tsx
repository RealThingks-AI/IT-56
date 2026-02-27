import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function CompanyInfoTab() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    billing_email: "",
    gst_number: "",
    timezone: "",
  });

  // Query itam_company_info instead of organisations
  const { data: companyInfo, isLoading } = useQuery({
    queryKey: ["itam-company-info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_company_info")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (companyInfo) {
      setFormData({
        name: companyInfo.company_name || "",
        address: companyInfo.address || "",
        billing_email: companyInfo.email || "",
        gst_number: "",
        timezone: "",
      });
    }
  }, [companyInfo]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (companyInfo?.id) {
        // Update existing
        const { error } = await supabase
          .from("itam_company_info")
          .update({
            company_name: formData.name.trim(),
            address: formData.address.trim() || null,
            email: formData.billing_email.trim() || null,
          })
          .eq("id", companyInfo.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("itam_company_info")
          .insert({
            company_name: formData.name.trim(),
            address: formData.address.trim() || null,
            email: formData.billing_email.trim() || null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Company information updated successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-company-info"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Company Information
        </CardTitle>
        <CardDescription className="text-xs">
          Update your company details used in reports and asset labels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_email">Billing Email</Label>
              <Input
                id="billing_email"
                type="email"
                value={formData.billing_email}
                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                placeholder="billing@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst_number">GST / Tax Number</Label>
              <Input
                id="gst_number"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                placeholder="Enter GST number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                placeholder="e.g., Asia/Kolkata"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter company address"
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending || !formData.name.trim()}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
