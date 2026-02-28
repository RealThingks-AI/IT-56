import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function CheckInDialog({ open, onOpenChange, assetId, assetName, onSuccess }: CheckInDialogProps) {
  const queryClient = useQueryClient();
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [emailAddress, setEmailAddress] = useState("");

  // Fetch assigned user's email when dialog opens
  const { data: assignedUserData } = useQuery({
    queryKey: ["asset-assigned-user-email", assetId],
    queryFn: async () => {
      const { data: asset } = await supabase
        .from("itam_assets")
        .select("assigned_to, checked_out_to")
        .eq("id", assetId)
        .single();

      const userId = asset?.checked_out_to || asset?.assigned_to;
      if (!userId) return null;

      const { data: user } = await supabase
        .from("users")
        .select("email, name")
        .eq("id", userId)
        .single();

      return { email: user?.email || null, name: user?.name || null };
    },
    enabled: open && !!assetId,
    staleTime: 0,
  });

  // Pre-fill email when data loads
  useEffect(() => {
    if (open && assignedUserData?.email) {
      setEmailAddress(assignedUserData.email);
    }
  }, [open, assignedUserData]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const now = checkInDate.toISOString();

      // Fetch current asset info before clearing
      const { data: currentAssetData } = await supabase
        .from("itam_assets")
        .select("asset_tag, assigned_to, checked_out_to")
        .eq("id", assetId)
        .single();

      // Resolve previous user name
      let previousUserName = "Unknown";
      const prevUserId = currentAssetData?.checked_out_to || currentAssetData?.assigned_to;
      if (prevUserId) {
        const { data: prevUser } = await supabase
          .from("users")
          .select("name, email")
          .eq("id", prevUserId)
          .single();
        previousUserName = prevUser?.name || prevUser?.email || prevUserId;
      }

      // Update asset status and clear assignment fields
      const { error: assetError } = await supabase
        .from("itam_assets")
        .update({
          status: ASSET_STATUS.AVAILABLE,
          assigned_to: null,
          checked_out_to: null,
          checked_out_at: null,
          expected_return_date: null,
          check_out_notes: null,
        })
        .eq("id", assetId);
      
      if (assetError) throw assetError;

      // Update any active assignment record
      await supabase
        .from("itam_asset_assignments")
        .update({ 
          returned_at: now,
          notes: notes || null,
        })
        .eq("asset_id", assetId)
        .is("returned_at", null);

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "checked_in",
        old_value: previousUserName,
        new_value: "Available",
        asset_tag: currentAssetData?.asset_tag || null,
        details: { 
          returned_at: now,
          returned_from: previousUserName,
          notes,
        },
        performed_by: currentUser?.id,
      });
    },
    onSuccess: async () => {
      toast.success("Asset checked in successfully");
      invalidateAllAssetQueries(queryClient);
      onSuccess?.();
      onOpenChange(false);

      // Send email notification (fire-and-forget)
      if (sendEmail && emailAddress) {
        try {
          // Fetch full asset details for table
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
              templateId: "checkin",
              recipientEmail: emailAddress,
              assets: assetRow ? [assetRow] : undefined,
              assetId,
              variables: {
                user_name: assignedUserData?.name || emailAddress.split('@')[0] || emailAddress,
                checkin_date: format(checkInDate, "dd/MM/yyyy HH:mm"),
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

      // Reset form
      setCheckInDate(new Date());
      setNotes("");
      setSendEmail(true);
      setEmailAddress("");
    },
    onError: (error) => {
      toast.error("Failed to check in asset");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    checkInMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Check In Asset</DialogTitle>
          <DialogDescription>
            Return "{assetName}" to available inventory.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Check-in Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(checkInDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkInDate}
                  onSelect={(date) => date && setCheckInDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Return Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the condition or return..."
              rows={3}
            />
          </div>

          {/* Send Email */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Checkbox
                id="sendCheckinEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked === true)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="sendCheckinEmail" className="text-xs font-normal cursor-pointer">
                Send email notification
              </Label>
            </div>
            {sendEmail && (
              <Input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Email address"
                className="h-8 text-sm"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={checkInMutation.isPending}
          >
            {checkInMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Check In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
