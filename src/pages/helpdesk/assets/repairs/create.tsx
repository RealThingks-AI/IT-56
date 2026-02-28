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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

const generateRepairNumber = () => {
  const now = new Date();
  const datePart = format(now, "yyyyMMdd");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RPR-${datePart}-${rand}`;
};

const CreateRepair = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const preSelectedAssetId = searchParams.get("assetId");

  const [formData, setFormData] = useState({
    asset_id: preSelectedAssetId || "",
    vendor_id: "",
    issue_description: "",
    diagnosis: "",
    cost: "",
    notes: "",
  });

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

  const createRepairMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const currentUser = (await supabase.auth.getUser()).data.user;

      const { data: repairData, error } = await supabase
        .from("itam_repairs")
        .insert({
          asset_id: data.asset_id,
          repair_number: generateRepairNumber(),
          vendor_id: data.vendor_id || null,
          issue_description: data.issue_description,
          diagnosis: data.diagnosis || null,
          cost: data.cost ? parseFloat(data.cost) : null,
          notes: data.notes || null,
          status: "open",
          created_by: currentUser?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("itam_assets")
        .update({ status: "maintenance", updated_by: currentUser?.id })
        .eq("id", data.asset_id);

      await supabase.from("itam_asset_history").insert({
        asset_id: data.asset_id,
        action: "repair_created",
        details: { issue: data.issue_description, repair_number: repairData.repair_number },
        performed_by: currentUser?.id,
      });

      return repairData;
    },
    onSuccess: (data) => {
      invalidateAllAssetQueries(queryClient);
      toast.success("Repair ticket created successfully");
      navigate(`/assets/repairs/detail/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create repair");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id || !formData.issue_description) {
      toast.error("Please fill in required fields");
      return;
    }
    createRepairMutation.mutate(formData);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in-0 duration-200">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Create Repair Ticket</h1>
            <p className="text-sm text-muted-foreground">Log a repair or maintenance request</p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset_id">
                  Asset <span className="text-destructive">*</span>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue_description">
                Issue Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="issue_description"
                value={formData.issue_description}
                onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                placeholder="Describe the issue..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Initial Diagnosis</Label>
              <Textarea
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="Preliminary diagnosis (optional)..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Estimated Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
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
