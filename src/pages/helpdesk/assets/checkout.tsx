import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Search, UserCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganisationUsers } from "@/hooks/useOrganisationUsers";
import { getUserDisplayName } from "@/lib/userUtils";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [expectedReturn, setExpectedReturn] = useState<Date>();
  const [notes, setNotes] = useState("");

  // Fetch available assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["itam-assets-available", search],
    queryFn: async () => {
      let query = supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name)")
        .eq("is_active", true)
        .eq("status", "available")
        .order("name");

      if (search) {
        query = query.or(`name.ilike.%${search}%,asset_tag.ilike.%${search}%,asset_id.ilike.%${search}%`);
      }

      const { data } = await query.limit(50);
      return data || [];
    },
  });

  // Fetch users from organisation (centralized hook)
  const { data: users = [] } = useOrganisationUsers();

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (selectedAssets.length === 0) throw new Error("Please select at least one asset");
      if (!assignTo) throw new Error("Please select a person to assign to");

      // Create assignments for all selected assets
      const assignments = selectedAssets.map(assetId => ({
        asset_id: assetId,
        assigned_to: assignTo,
        assigned_at: new Date().toISOString(),
        expected_return_date: expectedReturn?.toISOString() || null,
        notes: notes || null,
      }));

      const { error: assignError } = await supabase
        .from("itam_asset_assignments")
        .insert(assignments);

      if (assignError) throw assignError;

      // Update asset statuses to in_use (matches database constraint)
      const { error: updateError } = await supabase
        .from("itam_assets")
        .update({ status: "in_use" })
        .in("id", selectedAssets);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success(`${selectedAssets.length} asset(s) checked out successfully`);
      queryClient.invalidateQueries({ queryKey: ["itam-assets"] });
      navigate("/assets/allassets");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to checkout assets");
    },
  });

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleCheckout = () => {
    checkoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-xl font-semibold">Check Out Assets</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Asset Selection */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select Assets to Check Out</CardTitle>
              <CardDescription>Choose one or more available assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, tag, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selected Assets Summary */}
              {selectedAssets.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-accent rounded-lg">
                  <span className="text-sm font-medium">Selected ({selectedAssets.length}):</span>
                  {selectedAssets.map(id => {
                    const asset = assets.find(a => a.id === id);
                    return asset ? (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {asset.asset_tag || asset.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => toggleAsset(id)}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* Assets Table */}
              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Tag/ID</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow 
                        key={asset.id} 
                        className="cursor-pointer"
                        onClick={() => toggleAsset(asset.id)}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedAssets.includes(asset.id)}
                            onCheckedChange={() => toggleAsset(asset.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.asset_tag || asset.asset_id}</TableCell>
                        <TableCell>{asset.category?.name || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                    {assets.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No available assets found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Checkout Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assign To *</Label>
                <Select value={assignTo} onValueChange={setAssignTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
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

              <div className="space-y-2">
                <Label>Expected Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expectedReturn && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expectedReturn ? format(expectedReturn, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expectedReturn}
                      onSelect={setExpectedReturn}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add any notes about this checkout..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="pt-4 space-y-2">
                <Button 
                  className="w-full" 
                  onClick={handleCheckout}
                  disabled={selectedAssets.length === 0 || !assignTo || checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? "Processing..." : `Check Out ${selectedAssets.length} Asset(s)`}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/assets/allassets")}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
