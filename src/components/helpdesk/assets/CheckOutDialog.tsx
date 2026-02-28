import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { useUsers } from "@/hooks/useUsers";
import { getUserDisplayName } from "@/lib/userUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

interface CheckOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function CheckOutDialog({ open, onOpenChange, assetId, assetName, onSuccess }: CheckOutDialogProps) {
  const queryClient = useQueryClient();
  
  const [checkoutDate, setCheckoutDate] = useState<Date>(new Date());
  const [checkoutTo, setCheckoutTo] = useState<"person" | "location">("person");
  const [userId, setUserId] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [siteId, setSiteId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [emailAddress, setEmailAddress] = useState("");
  const [userComboOpen, setUserComboOpen] = useState(false);

  const { sites, locations, departments } = useAssetSetupConfig();

  const filteredLocations = useMemo(() => {
    if (!siteId) return locations;
    return locations.filter(loc => loc.site_id === siteId);
  }, [locations, siteId]);

  const { data: currentAsset, refetch: refetchAsset } = useQuery({
    queryKey: ["asset-checkout-validation", assetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("status, assigned_to")
        .eq("id", assetId)
        .single();
      return data;
    },
    enabled: open,
    staleTime: 0,
  });

  const { data: users = [] } = useUsers();

  const resetForm = () => {
    setCheckoutDate(new Date());
    setCheckoutTo("person");
    setUserId("");
    setDueDate(undefined);
    setSiteId("");
    setLocationId("");
    setDepartmentId("");
    setNotes("");
    setSendEmail(true);
    setEmailAddress("");
    setUserComboOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleUserChange = (newUserId: string) => {
    setUserId(newUserId);
    const selectedUser = users.find((u: any) => u.id === newUserId);
    if (selectedUser?.email) {
      setEmailAddress(selectedUser.email);
    }
    setUserComboOpen(false);
  };

  const handleSendEmailChange = (checked: boolean) => {
    setSendEmail(checked);
    if (checked && userId) {
      const selectedUser = users.find((u: any) => u.id === userId);
      if (selectedUser?.email) {
        setEmailAddress(selectedUser.email);
      }
    }
  };

  const selectedUserLabel = useMemo(() => {
    if (!userId) return "";
    const u = users.find((u: any) => u.id === userId);
    return u ? (getUserDisplayName(u) || u.email) : "";
  }, [userId, users]);

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const { data: freshAsset } = await refetchAsset();
      
      if (!freshAsset || freshAsset.status !== ASSET_STATUS.AVAILABLE) {
        throw new Error(`This asset is not available for checkout. Current status: ${freshAsset?.status || 'unknown'}`);
      }

      if (checkoutTo === "person" && !userId) {
        throw new Error("Please select a person to assign to");
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const checkoutTimestamp = checkoutDate.toISOString();

      const updateData: Record<string, any> = {
        status: ASSET_STATUS.IN_USE,
        checked_out_at: checkoutTimestamp,
        expected_return_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        check_out_notes: notes || null,
      };

      if (checkoutTo === "person") {
        updateData.assigned_to = userId;
        updateData.checked_out_to = userId;
      } else {
        updateData.assigned_to = null;
        updateData.checked_out_to = null;
      }

      if (locationId) updateData.location_id = locationId;
      if (departmentId) updateData.department_id = departmentId;

      const { error: assetError } = await supabase
        .from("itam_assets")
        .update(updateData)
        .eq("id", assetId);
      
      if (assetError) throw assetError;

      if (checkoutTo === "person" && userId) {
        const { error: assignmentError } = await supabase
          .from("itam_asset_assignments")
          .insert({
            asset_id: assetId,
            assigned_to: userId,
            assigned_at: checkoutTimestamp,
            assigned_by: currentUser?.id,
            notes: notes || null,
          });
        if (assignmentError) throw assignmentError;
      }

      const selectedUser = users.find((u: any) => u.id === userId);
      const historyDetails: Record<string, any> = {
        checkout_type: checkoutTo,
        checkout_date: checkoutTimestamp,
        expected_return: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
        notes,
      };

      if (checkoutTo === "person") {
        historyDetails.assigned_to = selectedUser?.name || selectedUser?.email;
        historyDetails.user_id = userId;
      }
      if (locationId) {
        const loc = locations.find(l => l.id === locationId);
        historyDetails.location = loc?.name;
        historyDetails.location_id = locationId;
      }
      if (departmentId) {
        const dept = departments.find(d => d.id === departmentId);
        historyDetails.department = dept?.name;
        historyDetails.department_id = departmentId;
      }

      const { data: assetRecord } = await supabase
        .from("itam_assets")
        .select("asset_tag")
        .eq("id", assetId)
        .single();

      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "checked_out",
        details: historyDetails,
        old_value: "Available",
        new_value: checkoutTo === "person" ? (selectedUser?.name || selectedUser?.email) : "Location",
        performed_by: currentUser?.id,
        asset_tag: assetRecord?.asset_tag || null,
      });
    },
    onSuccess: async () => {
      toast.success("Asset checked out successfully");
      invalidateAllAssetQueries(queryClient);
      onSuccess?.();
      handleOpenChange(false);

      if (sendEmail && emailAddress) {
        try {
          const selectedUser = users.find((u: any) => u.id === userId);
          const { data: fullAsset } = await supabase
            .from("itam_assets")
            .select("asset_tag, name, serial_number, model, custom_fields, itam_categories(name), make:itam_makes!make_id(name)")
            .eq("id", assetId)
            .single();

          const assetRow = fullAsset ? {
            asset_tag: fullAsset.asset_tag || "N/A",
            description: (fullAsset as any).itam_categories?.name || fullAsset.name || "N/A",
            brand: (fullAsset as any).make?.name || "N/A",
            model: fullAsset.model || "N/A",
            serial_number: fullAsset.serial_number || null,
            photo_url: (fullAsset.custom_fields as any)?.photo_url || null,
          } : undefined;

          const { data, error } = await supabase.functions.invoke("send-asset-email", {
            body: {
              templateId: "checkout",
              recipientEmail: emailAddress,
              assets: assetRow ? [assetRow] : undefined,
              assetId,
              variables: {
                user_name: selectedUser?.name || selectedUser?.email || "",
                checkout_date: format(checkoutDate, "dd/MM/yyyy HH:mm"),
                expected_return_date: dueDate ? format(dueDate, "dd/MM/yyyy") : "Not specified",
                notes: notes || "—",
              },
            },
          });
          if (error) throw error;
          if (data?.success && !data?.skipped) {
            toast.success("Email notification sent");
          }
        } catch (emailErr) {
          console.warn("Email notification failed:", emailErr);
          toast.warning("Email notification could not be sent");
        }
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to check out asset");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    checkOutMutation.mutate();
  };

  const isSubmitDisabled = checkoutTo === "person" ? !userId : false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Check Out Asset</DialogTitle>
          <DialogDescription className="text-xs">
            Assign "{assetName}" to a user or location
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-1">
          {/* Check-out Type */}
          <div className="space-y-1">
            <Label className="text-xs">Check-out to</Label>
            <RadioGroup
              value={checkoutTo}
              onValueChange={(value) => setCheckoutTo(value as "person" | "location")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="person" id="person" className="h-3.5 w-3.5" />
                <Label htmlFor="person" className="text-xs font-normal cursor-pointer">Person</Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="location" id="location" className="h-3.5 w-3.5" />
                <Label htmlFor="location" className="text-xs font-normal cursor-pointer">Site / Location</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Searchable user combobox */}
          {checkoutTo === "person" && (
            <div className="space-y-1">
              <Label className="text-xs">Assign to <span className="text-destructive">*</span></Label>
              <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userComboOpen}
                    className="w-full justify-between h-8 text-sm font-normal"
                  >
                    {selectedUserLabel || "Search user..."}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email..." className="h-8 text-sm" />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {users.map((user: any) => {
                          const label = getUserDisplayName(user) || user.email;
                          return (
                            <CommandItem
                              key={user.id}
                              value={`${user.name || ""} ${user.email || ""}`}
                              onSelect={() => handleUserChange(user.id)}
                              className="text-sm"
                            >
                              <Check className={cn("mr-2 h-3.5 w-3.5", userId === user.id ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{label}</span>
                              {user.name && user.email && (
                                <span className="ml-auto text-xs text-muted-foreground truncate">{user.email}</span>
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Check-out Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8", !checkoutDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {checkoutDate ? format(checkoutDate, "dd/MM/yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={checkoutDate} onSelect={(date) => date && setCheckoutDate(date)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-8", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} disabled={(date) => date < new Date()} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Site, Location, Department in one row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Site</Label>
              <Select value={siteId} onValueChange={(value) => { setSiteId(value); setLocationId(""); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} className="min-h-[40px] resize-none text-sm" />
          </div>

          {/* Send Email */}
          <div className="flex items-center gap-2">
            <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(checked) => handleSendEmailChange(checked === true)} className="h-3.5 w-3.5" />
            <Label htmlFor="sendEmail" className="text-xs font-normal cursor-pointer">Send email notification</Label>
            {sendEmail && (
              <Input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Email address"
                className="h-7 text-xs flex-1 ml-1"
              />
            )}
          </div>
        </div>

        <DialogFooter className="pt-1">
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={checkOutMutation.isPending || isSubmitDisabled}>
            {checkOutMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Check Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
