import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUsers } from "@/hooks/useUsers";
import { getUserDisplayName } from "@/lib/userUtils";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";
import { useAssetSetupConfig } from "@/hooks/assets/useAssetSetupConfig";
import { ASSET_STATUS } from "@/lib/assets/assetStatusUtils";

interface ReassignAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  currentAssignedTo: string | null;
  onSuccess?: () => void;
}

/** Send reassignment emails (fire-and-forget, errors logged but not thrown) */
async function sendReassignEmails({
  assetId,
  oldUserEmail,
  oldUserName,
  newUserEmail,
  newUserName,
  notes,
}: {
  assetId: string;
  oldUserEmail?: string | null;
  oldUserName: string;
  newUserEmail?: string | null;
  newUserName: string;
  notes: string;
}) {
  try {
    if (oldUserEmail) {
      await supabase.functions.invoke("send-asset-email", {
        body: {
          templateId: "reassign_from",
          recipientEmail: oldUserEmail,
          assetId,
          variables: {
            user_name: oldUserName,
            new_assignee: newUserName,
            notes: notes || "—",
          },
        },
      });
    }
    if (newUserEmail) {
      await supabase.functions.invoke("send-asset-email", {
        body: {
          templateId: "reassign_to",
          recipientEmail: newUserEmail,
          assetId,
          variables: {
            user_name: newUserName,
            old_assignee: oldUserName,
            notes: notes || "—",
          },
        },
      });
    }
  } catch (e) {
    console.warn("Reassign email send failed (non-blocking):", e);
  }
}

export function ReassignAssetDialog({ open, onOpenChange, assetId, assetName, currentAssignedTo, onSuccess }: ReassignAssetDialogProps) {
  const queryClient = useQueryClient();
  const [reassignTo, setReassignTo] = useState<"person" | "location">("person");
  const [newUserId, setNewUserId] = useState("");
  const [userComboOpen, setUserComboOpen] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const { data: users = [] } = useUsers();
  const { sites, locations } = useAssetSetupConfig();

  const filteredLocations = siteId
    ? locations.filter(l => l.site_id === siteId)
    : locations;

  const resetForm = () => {
    setReassignTo("person");
    setNewUserId("");
    setSiteId("");
    setLocationId("");
    setNotes("");
    setSendEmail(false);
  };

  const reassignMutation = useMutation({
    mutationFn: async () => {
      if (reassignTo === "person") {
        if (!newUserId) throw new Error("Please select a user to reassign to");
        if (newUserId === currentAssignedTo) throw new Error("Asset is already assigned to this user");
      } else {
        if (!locationId) throw new Error("Please select a location");
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      // Resolve previous user name & email
      let previousUserName = "Unknown";
      let previousUserEmail: string | null = null;
      if (currentAssignedTo) {
        const { data: prevUser } = await supabase.from("users").select("name, email").eq("id", currentAssignedTo).single();
        if (!prevUser) {
          // Try by auth_user_id
          const { data: prevUser2 } = await supabase.from("users").select("name, email").eq("auth_user_id", currentAssignedTo).single();
          previousUserName = prevUser2?.name || prevUser2?.email || currentAssignedTo;
          previousUserEmail = prevUser2?.email || null;
        } else {
          previousUserName = prevUser?.name || prevUser?.email || currentAssignedTo;
          previousUserEmail = prevUser?.email || null;
        }
      }

      // Get asset tag
      const { data: assetRecord } = await supabase.from("itam_assets").select("asset_tag").eq("id", assetId).single();

      if (reassignTo === "person") {
        const newUser = users.find(u => u.id === newUserId);
        const newUserName = getUserDisplayName(newUser) || newUser?.email || newUserId;
        const newUserEmail = newUser?.email || null;

        // Update asset assignment
        const { error: updateErr } = await supabase
          .from("itam_assets")
          .update({
            assigned_to: newUserId,
            checked_out_to: newUserId,
            updated_at: now,
          })
          .eq("id", assetId);
        if (updateErr) throw updateErr;

        // Close old assignment
        if (currentAssignedTo) {
          await supabase
            .from("itam_asset_assignments")
            .update({ returned_at: now, notes: `Reassigned to ${newUserName}` })
            .eq("asset_id", assetId)
            .eq("assigned_to", currentAssignedTo)
            .is("returned_at", null);
        }

        // Create new assignment
        await supabase.from("itam_asset_assignments").insert({
          asset_id: assetId,
          assigned_to: newUserId,
          assigned_by: currentUser?.id || null,
          assigned_at: now,
          notes: notes || null,
        });

        // Log to history with enriched details
        await supabase.from("itam_asset_history").insert({
          asset_id: assetId,
          action: "reassigned",
          old_value: previousUserName,
          new_value: newUserName,
          asset_tag: assetRecord?.asset_tag || null,
          details: {
            from: previousUserName,
            to: newUserName,
            from_user_id: currentAssignedTo,
            to_user_id: newUserId,
            user_id: newUserId,
            reassign_date: now,
            reassign_type: "person",
            notes: notes || undefined,
          },
          performed_by: currentUser?.id,
        });

        // Send emails (non-blocking) only if opted in
        if (sendEmail) {
          sendReassignEmails({
            assetId,
            oldUserEmail: previousUserEmail,
            oldUserName: previousUserName,
            newUserEmail,
            newUserName,
            notes,
          });
        }
      } else {
        // Location reassignment
        const loc = locations.find(l => l.id === locationId);
        const site = sites.find(s => s.id === siteId);
        const locationLabel = [site?.name, loc?.name].filter(Boolean).join(" — ");

        const { error: updateErr } = await supabase
          .from("itam_assets")
          .update({
            assigned_to: null,
            checked_out_to: null,
            location_id: locationId,
            status: ASSET_STATUS.AVAILABLE,
            updated_at: now,
          })
          .eq("id", assetId);
        if (updateErr) throw updateErr;

        // Close old assignment
        if (currentAssignedTo) {
          await supabase
            .from("itam_asset_assignments")
            .update({ returned_at: now, notes: `Reassigned to location: ${locationLabel}` })
            .eq("asset_id", assetId)
            .eq("assigned_to", currentAssignedTo)
            .is("returned_at", null);
        }

        // Log to history with enriched details
        await supabase.from("itam_asset_history").insert({
          asset_id: assetId,
          action: "reassigned",
          old_value: previousUserName,
          new_value: locationLabel,
          asset_tag: assetRecord?.asset_tag || null,
          details: {
            from: previousUserName,
            to: locationLabel,
            from_user_id: currentAssignedTo,
            type: "location",
            reassign_date: now,
            reassign_type: "location",
            site: site?.name,
            location: loc?.name,
            notes: notes || undefined,
          },
          performed_by: currentUser?.id,
        });

        // Send email to old user (non-blocking) only if opted in
        if (sendEmail && previousUserEmail) {
          sendReassignEmails({
            assetId,
            oldUserEmail: previousUserEmail,
            oldUserName: previousUserName,
            newUserEmail: null,
            newUserName: locationLabel,
            notes,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Asset reassigned successfully");
      invalidateAllAssetQueries(queryClient);
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reassign asset");
      console.error(error);
    },
  });

  // Filter out current assignee from list
  const availableUsers = users.filter(u => u.id !== currentAssignedTo);

  const isValid = reassignTo === "person" ? !!newUserId : !!locationId;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign Asset</DialogTitle>
          <DialogDescription>
            Reassign "{assetName}" to a different user or location.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Reassign to</Label>
            <RadioGroup
              value={reassignTo}
              onValueChange={(v) => { setReassignTo(v as "person" | "location"); setNewUserId(""); setSiteId(""); setLocationId(""); }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="person" id="reassign-person" />
                <Label htmlFor="reassign-person" className="cursor-pointer font-normal">User</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="location" id="reassign-location" />
                <Label htmlFor="reassign-location" className="cursor-pointer font-normal">Site / Location</Label>
              </div>
            </RadioGroup>
          </div>

          {reassignTo === "person" ? (
            <div className="space-y-2">
              <Label>New Assignee <span className="text-destructive">*</span></Label>
              <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={userComboOpen} className="w-full justify-between font-normal">
                    {newUserId ? (getUserDisplayName(availableUsers.find(u => u.id === newUserId)) || availableUsers.find(u => u.id === newUserId)?.email || "Select user") : "Search users..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map((user) => (
                          <CommandItem key={user.id} value={`${getUserDisplayName(user) || ""} ${user.email || ""}`} onSelect={() => { setNewUserId(user.id); setUserComboOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", newUserId === user.id ? "opacity-100" : "opacity-0")} />
                            {getUserDisplayName(user) || user.email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Site</Label>
                <Select value={siteId} onValueChange={(v) => { setSiteId(v); setLocationId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select site (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location <span className="text-destructive">*</span></Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}{loc.itam_sites?.name ? ` (${loc.itam_sites.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="reassign-notes">Notes</Label>
            <Textarea
              id="reassign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for reassignment..."
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reassign-send-email"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(!!checked)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="reassign-send-email" className="text-xs font-normal cursor-pointer">
                Send email notification to user
              </Label>
            </div>
            {sendEmail && (() => {
              const emails: string[] = [];
              if (reassignTo === "person") {
                if (currentAssignedTo) {
                  const prevUser = users.find(u => u.id === currentAssignedTo);
                  if (prevUser?.email) emails.push(prevUser.email);
                }
                const newUser = users.find(u => u.id === newUserId);
                if (newUser?.email) emails.push(newUser.email);
              } else {
                if (currentAssignedTo) {
                  const prevUser = users.find(u => u.id === currentAssignedTo);
                  if (prevUser?.email) emails.push(prevUser.email);
                }
              }
              const unique = [...new Set(emails)];
              return unique.length > 0 ? (
                <p className="text-[11px] text-muted-foreground pl-5">
                  To: {unique.join(", ")}
                </p>
              ) : null;
            })()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={() => reassignMutation.mutate()}
            disabled={reassignMutation.isPending || !isValid}
          >
            {reassignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
