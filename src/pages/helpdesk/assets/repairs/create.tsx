import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const CreateRepair = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const preSelectedAssetId = searchParams.get("assetId");

  const [formData, setFormData] = useState({
    asset_id: preSelectedAssetId || "",
    vendor_id: "",
    issue_description: "",
    cost: "",
    notes: "",
  });

  // Fetch assets
  const { data: assets = [] } = useQuery({
    queryKey: ["itam-assets-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("id, asset_tag, name")
        .eq("is_active", true)
        .order("asset_tag");
      return data || [];
    },
  });

  // Fetch vendors
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

  // Create repair mutation
  const createRepairMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const currentUser = (await supabase.auth.getUser()).data.user;

      const { data: repairData, error } = await supabase
        .from("itam_repairs")
        .insert({
          asset_id: data.asset_id,
          vendor_id: data.vendor_id || null,
          issue_description: data.issue_description,
          cost: data.cost ? parseFloat(data.cost) : null,
          notes: data.notes,
          status: "open",
          created_by: currentUser?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update asset status to maintenance
      await supabase
        .from("itam_assets")
        .update({ status: "maintenance", updated_by: currentUser?.id })
        .eq("id", data.asset_id);

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: data.asset_id,
        action: "repair_created",
        details: { issue: data.issue_description },
        performed_by: currentUser?.id,
      });

      return repairData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["itam-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["itam-assets"] });
      toast({
        title: "Success",
        description: "Repair ticket created successfully",
      });
      navigate(`/assets/repairs/detail/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create repair",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_id || !formData.issue_description) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    createRepairMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Create Repair Ticket</h1>
            <p className="text-sm text-muted-foreground">Log a repair or maintenance request</p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset_id">
                  Asset <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.asset_id}
                  onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                  disabled={!!preSelectedAssetId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_tag} - {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_id">Service Provider / Vendor</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor (optional)" />
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

              <div className="space-y-2">
                <Label htmlFor="issue_description">
                  Issue Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="issue_description"
                  value={formData.issue_description}
                  onChange={(e) =>
                    setFormData({ ...formData, issue_description: e.target.value })
                  }
                  placeholder="Describe the issue..."
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Estimated Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/assets/repairs")}
                disabled={createRepairMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRepairMutation.isPending}>
                {createRepairMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Repair
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateRepair;
