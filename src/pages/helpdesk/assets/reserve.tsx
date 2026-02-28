import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { CalendarIcon, Search, CalendarCheck, X, Check, ChevronsUpDown } from "lucide-react";
import { cn, sanitizeSearchInput } from "@/lib/utils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

const ReservePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [reserveFor, setReserveFor] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [notes, setNotes] = useState("");
  const [userComboOpen, setUserComboOpen] = useState(false);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["itam-assets-for-reservation", search],
    queryFn: async () => {
      let query = supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name)")
        .eq("is_active", true)
        .eq("status", "available")
        .order("name");

      if (search) {
        const s = sanitizeSearchInput(search);
        query = query.or(`name.ilike.%${s}%,asset_tag.ilike.%${s}%,asset_id.ilike.%${s}%`);
      }

      const { data } = await query.limit(50);
      return data || [];
    },
  });

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

  // Recent reservations
  const { data: recentReservations = [] } = useQuery({
    queryKey: ["itam-recent-reservations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_asset_reservations")
        .select("*, asset:itam_assets(name, asset_tag, asset_id)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!data || data.length === 0) return [];

      const userIds = [...new Set([...data.map(d => d.reserved_for), ...data.map(d => d.reserved_by)].filter(Boolean))] as string[];
      let userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from("users").select("id, auth_user_id, name, email").or(`id.in.(${userIds.join(",")}),auth_user_id.in.(${userIds.join(",")})`);
        (usersData || []).forEach(u => {
          userMap.set(u.id, u.name || u.email || u.id);
          if (u.auth_user_id) userMap.set(u.auth_user_id, u.name || u.email || u.id);
        });
      }

      return data.map(d => ({
        ...d,
        reserved_for_display: d.reserved_for ? (userMap.get(d.reserved_for) || d.reserved_for_name || "—") : "—",
      }));
    },
  });

  const reserveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAsset) throw new Error("Please select an asset");
      if (!reserveFor) throw new Error("Please select a person to reserve for");
      if (endDate <= startDate) throw new Error("End date must be after start date");

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("itam_asset_reservations")
        .insert({
          asset_id: selectedAsset,
          reserved_for: reserveFor,
          reserved_by: currentUser?.id,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          purpose: notes || null,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset reserved successfully");
      invalidateAllAssetQueries(queryClient);
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
  const selectedUser = users.find(u => u.id === reserveFor);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-[500px] rounded-lg" />
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Asset Selection */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select Asset to Reserve</CardTitle>
              <CardDescription>Choose an asset for future use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, tag, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

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
                        <TableCell>
                          <span
                            className="text-primary hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/assets/detail/${asset.asset_tag || asset.asset_id}`);
                            }}
                          >
                            {asset.asset_tag || asset.asset_id}
                          </span>
                        </TableCell>
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
                    {assets.length === 0 && (
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

          {/* Reservation Form + Recent Reservations */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" />
                  Reservation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Reserve For *</Label>
                  <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userComboOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedUser ? (selectedUser.name || selectedUser.email) : "Select person..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {users.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.name || ""} ${user.email}`}
                                onSelect={() => {
                                  setReserveFor(user.id);
                                  setUserComboOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", reserveFor === user.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span className="text-sm">{user.name || user.email}</span>
                                  {user.name && <span className="text-xs text-muted-foreground">{user.email}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(endDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} initialFocus disabled={(date) => date < startDate} className="pointer-events-auto" />
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

                <div className="pt-4 flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={handleReserve}
                    disabled={!selectedAsset || !reserveFor || reserveMutation.isPending}
                  >
                    {reserveMutation.isPending ? "Processing..." : "Reserve Asset"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => navigate("/assets/allassets")}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Reservations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Reservations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[250px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Asset</TableHead>
                        <TableHead className="text-xs">For</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentReservations.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">
                            <span
                              className="text-primary hover:underline cursor-pointer"
                              onClick={() => navigate(`/assets/detail/${r.asset?.asset_tag || r.asset?.asset_id}`)}
                            >
                              {r.asset?.asset_tag || r.asset?.name || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{r.reserved_for_display}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.start_date ? format(new Date(r.start_date), "MMM dd") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {recentReservations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                            No recent reservations
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
};

export default ReservePage;
