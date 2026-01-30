import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AssetTopBar } from "@/components/helpdesk/assets/AssetTopBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { CalendarIcon, Search, CalendarCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ReservePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [reserveFor, setReserveFor] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [notes, setNotes] = useState("");

  // Fetch available assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["itam-assets-for-reservation", search],
    queryFn: async () => {
      let query = supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name)")
        .eq("is_active", true)
        .in("status", ["available", "assigned"])
        .order("name");

      if (search) {
        query = query.or(`name.ilike.%${search}%,asset_tag.ilike.%${search}%,asset_id.ilike.%${search}%`);
      }

      const { data } = await query.limit(50);
      return data || [];
    },
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ["users-for-reservation"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("status", "active")
        .order("name");
      return data || [];
    },
  });

  // Reserve mutation (creates an assignment with future dates)
  const reserveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAsset) throw new Error("Please select an asset");
      if (!reserveFor) throw new Error("Please select a person to reserve for");

      const { error } = await supabase
        .from("itam_asset_assignments")
        .insert({
          asset_id: selectedAsset,
          assigned_to: reserveFor,
          assigned_at: startDate.toISOString(),
          expected_return_date: endDate.toISOString(),
          notes: notes ? `[RESERVATION] ${notes}` : '[RESERVATION]',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset reserved successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-assets"] });
      navigate("/assets/allassets");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reserve asset");
    },
  });

  const handleReserve = () => {
    reserveMutation.mutate();
  };

  const selectedAssetData = assets.find(a => a.id === selectedAsset);

  return (
    <div className="min-h-screen bg-background">
      <AssetTopBar />
      
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Asset Selection */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select Asset to Reserve</CardTitle>
              <CardDescription>Choose an asset for future use</CardDescription>
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

              {/* Selected Asset */}
              {selectedAssetData && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm font-medium">Selected:</span>
                  <Badge variant="default" className="gap-1">
                    {selectedAssetData.asset_tag || selectedAssetData.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setSelectedAsset(null)}
                    />
                  </Badge>
                </div>
              )}

              {/* Assets Table */}
              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Tag/ID</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow 
                        key={asset.id} 
                        className={cn(
                          "cursor-pointer",
                          selectedAsset === asset.id && "bg-primary/10"
                        )}
                        onClick={() => setSelectedAsset(asset.id)}
                      >
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.asset_tag || asset.asset_id}</TableCell>
                        <TableCell>{asset.category?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={asset.status === "available" ? "secondary" : "outline"}
                          >
                            {asset.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {assets.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No assets found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Reservation Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Reservation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reserve For *</Label>
                <Select value={reserveFor} onValueChange={setReserveFor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                      disabled={(date) => date < startDate}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add any notes about this reservation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="pt-4 space-y-2">
                <Button 
                  className="w-full" 
                  onClick={handleReserve}
                  disabled={!selectedAsset || !reserveFor || reserveMutation.isPending}
                >
                  {reserveMutation.isPending ? "Processing..." : "Reserve Asset"}
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

export default ReservePage;
