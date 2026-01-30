import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const AddSubscription = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tool_name: "",
    vendor_id: "",
    cost: "",
    subscription_type: "monthly",
    renewal_date: "",
    license_count: "1",
    notes: "",
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["subscription-vendors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions_vendors")
        .select("*")
        .order("vendor_name");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("subscriptions_tools").insert([{
        tool_name: data.tool_name,
        vendor_id: data.vendor_id || null,
        cost: parseFloat(data.cost),
        subscription_type: data.subscription_type,
        renewal_date: data.renewal_date,
        license_count: parseInt(data.license_count),
        notes: data.notes || null,
        status: "active",
      }] as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
      toast.success("Subscription added successfully");
      navigate("/helpdesk/subscription/list");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add subscription");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tool_name || !formData.cost || !formData.renewal_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-2xl font-bold">Add Subscription</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tool_name">
                  Tool Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tool_name"
                  value={formData.tool_name}
                  onChange={(e) =>
                    setFormData({ ...formData, tool_name: e.target.value })
                  }
                  placeholder="e.g., Slack, GitHub, Figma"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_id">Vendor</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vendor_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">
                    Cost <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subscription_type">
                    Billing Cycle <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.subscription_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, subscription_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="per_user">Per User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="renewal_date">
                    Renewal Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="renewal_date"
                    type="date"
                    value={formData.renewal_date}
                    onChange={(e) =>
                      setFormData({ ...formData, renewal_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license_count">
                    Total Seats <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="license_count"
                    type="number"
                    min="1"
                    value={formData.license_count}
                    onChange={(e) =>
                      setFormData({ ...formData, license_count: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional information..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/helpdesk/subscription/list")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Subscription"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default AddSubscription;
