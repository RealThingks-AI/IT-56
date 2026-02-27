import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface POItem {
  name: string;
  quantity: number;
  unit_price: number;
}

const CreatePO = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [vendorId, setVendorId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [items, setItems] = useState<POItem[]>([
    { name: "", quantity: 1, unit_price: 0 },
  ]);

  const { data: vendors = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["itam-vendors"],
    queryFn: async () => {
      // @ts-ignore - Bypass deep type inference issue
      const { data } = await supabase
        .from("itam_vendors")
        .select("id, name")
        .eq("is_deleted", false)
        .order("name");
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  const createPO = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate PO number
      const { data: lastPO } = await supabase
        .from("itam_purchase_orders")
        .select("po_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let poNumber = "PO-0001";
      if (lastPO?.po_number) {
        const lastNum = parseInt(lastPO.po_number.split("-")[1]);
        poNumber = `PO-${String(lastNum + 1).padStart(4, "0")}`;
      }

      const { error } = await supabase.from("itam_purchase_orders").insert({
        ...data,
        po_number: poNumber,
        created_by: user.id,
        status: "draft",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itam-purchase-orders"] });
      toast.success("Purchase Order created successfully");
      navigate("/assets/purchase-orders");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create PO");
    },
  });

  const handleAddItem = () => {
    setItems([...items, { name: "", quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId) {
      toast.error("Please select a vendor");
      return;
    }

    if (items.length === 0 || items.some(item => !item.name || item.quantity <= 0)) {
      toast.error("Please add at least one valid item");
      return;
    }

    createPO.mutate({
      vendor_id: parseInt(vendorId),
      items: items,
      total_amount: calculateTotal(),
      currency,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Create Purchase Order</h1>
            <p className="text-sm text-muted-foreground">
              Create a new PO for asset procurement
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>PO Details</CardTitle>
              <CardDescription>Vendor and item information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor *</Label>
                  <Select value={vendorId} onValueChange={setVendorId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button type="button" onClick={handleAddItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Item Name</Label>
                      <Input
                        placeholder="e.g., Dell Laptop XPS 15"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, "name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value))}
                        required
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Total</Label>
                      <Input
                        value={(item.quantity * item.unit_price).toFixed(2)}
                        disabled
                      />
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <span className="text-lg font-semibold">
                  Total: {currency} {calculateTotal().toFixed(2)}
                </span>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/assets/purchase-orders")}
                  disabled={createPO.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createPO.isPending}>
                  {createPO.isPending ? "Creating..." : "Create PO"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default CreatePO;
