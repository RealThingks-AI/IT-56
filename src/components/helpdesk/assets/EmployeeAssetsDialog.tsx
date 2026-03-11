import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package, Mail, User, MoreHorizontal, ExternalLink, RotateCcw, UserPlus, CheckSquare, Send, Loader2, CheckCircle2, XCircle, Minus, ShieldCheck, EyeOff } from "lucide-react";
import { getStatusLabel, ASSET_STATUS } from "@/lib/assets/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";
import { useUsers } from "@/hooks/useUsers";
import { useAssetSetupConfig } from "@/hooks/assets/useAssetSetupConfig";
import { toast } from "sonner";
import { getAvatarColor } from "@/lib/avatarUtils";
import { getUserDisplayName } from "@/lib/userUtils";
import { SortableTableHeader } from "@/components/helpdesk/SortableTableHeader";
import { useSortableAssets } from "@/hooks/assets/useSortableAssets";

interface Employee {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  email: string;
  role: string | null;
  status: string | null;
}

interface EmployeeAssetsDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeAssetsDialog({ employee, open, onOpenChange }: EmployeeAssetsDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: allUsers = [] } = useUsers();
  const { sites, locations } = useAssetSetupConfig();

  // Sub-dialog states
  const [reassignAsset, setReassignAsset] = useState<any>(null);
  const [reassignTo, setReassignTo] = useState<"person" | "location">("person");
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignSiteId, setReassignSiteId] = useState("");
  const [reassignLocationId, setReassignLocationId] = useState("");
  const [returnAsset, setReturnAsset] = useState<any>(null);
  const [reassignNotes, setReassignNotes] = useState("");
  const [sendEmailOnReassign, setSendEmailOnReassign] = useState(false);
  const [bulkReassignNotes, setBulkReassignNotes] = useState("");
  const [bulkSendEmail, setBulkSendEmail] = useState(false);
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"reassign" | "return" | null>(null);
  const [bulkReassignTo, setBulkReassignTo] = useState<"person" | "location">("person");
  const [bulkReassignUserId, setBulkReassignUserId] = useState("");
  const [bulkReassignSiteId, setBulkReassignSiteId] = useState("");
  const [bulkReassignLocationId, setBulkReassignLocationId] = useState("");

  const filteredLocations = reassignSiteId ? locations.filter(l => l.site_id === reassignSiteId) : locations;
  const bulkFilteredLocations = bulkReassignSiteId ? locations.filter(l => l.site_id === bulkReassignSiteId) : locations;

  // Reset selection when employee changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [employee?.id]);

  const [includeHidden, setIncludeHidden] = useState(false);

  // Fetch assets assigned to this employee
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["employee-assigned-assets", employee?.id, employee?.auth_user_id, includeHidden],
    queryFn: async () => {
      if (!employee?.id) return [];
      const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
      const orFilter = ids.map(id => `assigned_to.eq.${id}`).join(',');
      let query = supabase
        .from("itam_assets")
        .select("id, name, asset_tag, asset_id, status, confirmation_status, last_confirmed_at, serial_number, model, custom_fields, is_hidden, category:itam_categories(name), make:itam_makes!make_id(name)")
        .or(orFilter)
        .eq("is_active", true);
      if (!includeHidden) {
        query = query.eq("is_hidden", false);
      }
      const { data } = await query.order("name");
      return data || [];
    },
    enabled: !!employee?.id && open,
  });

  // Check if employee has any hidden assets (always fetch to know whether to show checkbox)
  const { data: hiddenAssetCount = 0 } = useQuery({
    queryKey: ["employee-hidden-asset-count", employee?.id, employee?.auth_user_id],
    queryFn: async () => {
      if (!employee?.id) return 0;
      const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
      const orFilter = ids.map(id => `assigned_to.eq.${id}`).join(',');
      const { count } = await supabase
        .from("itam_assets")
        .select("id", { count: "exact", head: true })
        .or(orFilter)
        .eq("is_active", true)
        .eq("is_hidden", true);
      return count || 0;
    },
    enabled: !!employee?.id && open,
  });


  const { data: lastConfirmation } = useQuery({
    queryKey: ["employee-last-confirmation", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return null;
      const { data } = await supabase
        .from("itam_asset_confirmations")
        .select("id, requested_at, status, completed_at")
        .eq("user_id", employee.id)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!employee?.id && open,
  });

  // Send confirmation email mutation
  const confirmWithUserMutation = useMutation({
    mutationFn: async () => {
      if (!employee) throw new Error("No employee selected");
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current user's app-level id
      const { data: currentUser } = await supabase.from("users").select("id").eq("auth_user_id", user?.id).single();

      // Create confirmation record
      const { data: confirmation, error: confErr } = await supabase
        .from("itam_asset_confirmations")
        .insert({
          user_id: employee.id,
          requested_by: currentUser?.id || null,
        })
        .select("id, token")
        .single();
      if (confErr) throw confErr;

      // Filter out hidden assets if includeHidden is false
      const confirmAssets = includeHidden ? assets : assets.filter((a: any) => !a.is_hidden);
      if (confirmAssets.length === 0) throw new Error("No assets to confirm (all are hidden)");

      // Create confirmation items
      const items = confirmAssets.map((a: any) => ({
        confirmation_id: confirmation.id,
        asset_id: a.id,
        asset_tag: a.asset_id || a.asset_tag || null,
        asset_name: a.name || null,
      }));
      const { data: insertedItems, error: itemsErr } = await supabase
        .from("itam_asset_confirmation_items")
        .insert(items)
        .select("id, asset_id");
      if (itemsErr) throw itemsErr;

      // Map asset_id to confirmation item id
      const itemIdMap = new Map((insertedItems || []).map((it: any) => [it.asset_id, it.id]));

      // Build confirm/deny URLs using edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const confirmAllUrl = `${supabaseUrl}/functions/v1/asset-confirmation?action=confirm_all&token=${confirmation.token}`;
      const denyAllUrl = `${supabaseUrl}/functions/v1/asset-confirmation?action=deny_all&token=${confirmation.token}`;

      // Build asset rows for email with full data and per-item action URLs
      const emailAssets = confirmAssets.map((a: any) => {
        const itemId = itemIdMap.get(a.id);
        return {
          asset_tag: a.asset_id || a.asset_tag || "N/A",
          description: a.category?.name || a.name || "N/A",
          brand: (a.make as any)?.name || "N/A",
          model: a.model || "N/A",
          serial_number: a.serial_number || null,
          photo_url: (a.custom_fields as any)?.photo_url || null,
          confirm_url: itemId ? `${supabaseUrl}/functions/v1/asset-confirmation?action=confirm_item&token=${confirmation.token}&item_id=${itemId}` : undefined,
          deny_url: itemId ? `${supabaseUrl}/functions/v1/asset-confirmation?action=deny_item&token=${confirmation.token}&item_id=${itemId}` : undefined,
        };
      });

      // Send email via send-asset-email
      const { error: emailErr } = await supabase.functions.invoke("send-asset-email", {
        body: {
          templateId: "asset_confirmation",
          recipientEmail: employee.email,
          assets: emailAssets,
          variables: {
            user_name: employee.name || employee.email,
            asset_count: String(confirmAssets.length),
            confirm_all_url: confirmAllUrl,
            deny_all_url: denyAllUrl,
          },
        },
      });
      if (emailErr) throw emailErr;
    },
    onSuccess: () => {
      toast.success("Confirmation email sent to " + (employee?.name || employee?.email));
      queryClient.invalidateQueries({ queryKey: ["employee-last-confirmation"] });
    },
    onError: (err: Error) => toast.error("Failed to send: " + err.message),
  });

  // Fetch assignment history
  const { data: history = [] } = useQuery({
    queryKey: ["employee-asset-history", employee?.id, employee?.auth_user_id],
    queryFn: async () => {
      if (!employee?.id) return [];
      const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
      const orFilter = ids.map(id => `assigned_to.eq.${id}`).join(',');
      const { data } = await supabase
        .from("itam_asset_assignments")
        .select(`id, assigned_at, returned_at, asset:itam_assets(id, name, asset_tag, asset_id)`)
        .or(orFilter)
        .not("returned_at", "is", null)
        .order("returned_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!employee?.id && open,
  });

  // Reassign mutation
  const reassignMutation = useMutation({
    mutationFn: async ({ assetId, newUserId, toLocation }: { assetId: string; newUserId?: string; toLocation?: { siteId: string; locationId: string } }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const fromName = employee?.name || employee?.email || employee?.id || "Unknown";
      const fromEmail = employee?.email || null;
      const { data: assetRecord } = await supabase.from("itam_assets").select("asset_tag").eq("id", assetId).single();

      if (toLocation) {
        // Location reassignment
        const loc = locations.find(l => l.id === toLocation.locationId);
        const site = sites.find(s => s.id === toLocation.siteId);
        const locationLabel = [site?.name, loc?.name].filter(Boolean).join(" — ");

        const { error: updateErr } = await supabase.from("itam_assets")
          .update({ assigned_to: null, checked_out_to: null, location_id: toLocation.locationId, status: ASSET_STATUS.AVAILABLE, updated_at: now })
          .eq("id", assetId);
        if (updateErr) throw updateErr;

        // Close old assignment
        if (employee) {
          const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
          for (const uid of ids) {
            await supabase.from("itam_asset_assignments")
              .update({ returned_at: now, notes: `Reassigned to location: ${locationLabel}` }).eq("asset_id", assetId).eq("assigned_to", uid).is("returned_at", null);
          }
        }

        await supabase.from("itam_asset_history").insert({
          asset_id: assetId, action: "reassigned", old_value: fromName, new_value: locationLabel,
          asset_tag: assetRecord?.asset_tag || null,
          details: { from: fromName, to: locationLabel, from_user_id: employee?.id, type: "location", reassign_date: now, reassign_type: "location", notes: reassignNotes || undefined },
          performed_by: user?.id,
        });

        // Email old user (only if opted in)
        if (sendEmailOnReassign && fromEmail) {
          supabase.functions.invoke("send-asset-email", {
            body: { templateId: "reassign_from", recipientEmail: fromEmail, assetId, variables: { user_name: fromName, new_assignee: locationLabel, notes: reassignNotes || "—" } },
          }).catch(e => console.warn("Reassign email failed:", e));
        }
      } else if (newUserId) {
        // User reassignment — fix: also update checked_out_to
        const { error: updateErr } = await supabase.from("itam_assets")
          .update({ assigned_to: newUserId, checked_out_to: newUserId, status: ASSET_STATUS.IN_USE, updated_at: now })
          .eq("id", assetId);
        if (updateErr) throw updateErr;

        if (employee) {
          const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
          for (const uid of ids) {
            await supabase.from("itam_asset_assignments")
              .update({ returned_at: now, notes: `Reassigned to another user` }).eq("asset_id", assetId).eq("assigned_to", uid).is("returned_at", null);
          }
        }

        await supabase.from("itam_asset_assignments").insert({
          asset_id: assetId, assigned_to: newUserId, assigned_by: user?.id || null, assigned_at: now, notes: reassignNotes || null,
        });

        const toUser = allUsers.find(u => u.id === newUserId);
        const toName = toUser?.name || toUser?.email || newUserId;
        const toEmail = toUser?.email || null;
        await supabase.from("itam_asset_history").insert({
          asset_id: assetId, action: "reassigned", old_value: fromName, new_value: toName,
          asset_tag: assetRecord?.asset_tag || null,
          details: { from: fromName, to: toName, from_user_id: employee?.id, to_user_id: newUserId, user_id: newUserId, reassign_date: now, reassign_type: "person", notes: reassignNotes || undefined },
          performed_by: user?.id,
        });

        // Send emails (non-blocking, only if opted in)
        if (sendEmailOnReassign) {
          if (fromEmail) {
            supabase.functions.invoke("send-asset-email", {
              body: { templateId: "reassign_from", recipientEmail: fromEmail, assetId, variables: { user_name: fromName, new_assignee: toName, notes: reassignNotes || "—" } },
            }).catch(e => console.warn("Reassign email failed:", e));
          }
          if (toEmail) {
            supabase.functions.invoke("send-asset-email", {
              body: { templateId: "reassign_to", recipientEmail: toEmail, assetId, variables: { user_name: toName, old_assignee: fromName, notes: reassignNotes || "—" } },
            }).catch(e => console.warn("Reassign email failed:", e));
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Asset reassigned successfully");
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employee-assigned-assets"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-history"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
      setReassignAsset(null);
      setReassignUserId("");
      setReassignTo("person");
      setReassignSiteId("");
      setReassignLocationId("");
      setReassignNotes("");
      setSendEmailOnReassign(false);
    },
    onError: (err: Error) => toast.error("Failed to reassign: " + err.message),
  });

  // Return to stock mutation
  const returnMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error: updateErr } = await supabase
        .from("itam_assets")
        .update({ 
          assigned_to: null, 
          status: ASSET_STATUS.AVAILABLE, 
          updated_at: new Date().toISOString(),
          checked_out_to: null,
          checked_out_at: null,
          expected_return_date: null,
          check_out_notes: null,
        })
        .eq("id", assetId);
      if (updateErr) throw updateErr;

      // Close assignment record
      if (employee) {
        const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
        for (const uid of ids) {
          await supabase
            .from("itam_asset_assignments")
            .update({ returned_at: new Date().toISOString() })
            .eq("asset_id", assetId)
            .eq("assigned_to", uid)
            .is("returned_at", null);
        }
      }

      // Log to history with resolved names
      const { data: { user } } = await supabase.auth.getUser();
      const returnedFromName = employee?.name || employee?.email || employee?.id || "Unknown";
      const { data: assetRec } = await supabase.from("itam_assets").select("asset_tag").eq("id", assetId).single();

      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "returned_to_stock",
        old_value: returnedFromName,
        new_value: "In Stock",
        asset_tag: assetRec?.asset_tag || null,
        details: { returned_from: returnedFromName },
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      toast.success("Asset returned to stock");
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employee-assigned-assets"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-history"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
      setReturnAsset(null);
    },
    onError: (err: Error) => toast.error("Failed to return: " + err.message),
  });

  // Bulk return mutation — direct DB calls to avoid N toasts
  const bulkReturnMutation = useMutation({
    mutationFn: async (assetIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      for (const assetId of assetIds) {
        await supabase.from("itam_assets").update({
          assigned_to: null, status: ASSET_STATUS.AVAILABLE, updated_at: new Date().toISOString(),
          checked_out_to: null, checked_out_at: null, expected_return_date: null, check_out_notes: null,
        }).eq("id", assetId);

        if (employee) {
          const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
          for (const uid of ids) {
            await supabase.from("itam_asset_assignments")
              .update({ returned_at: new Date().toISOString() })
              .eq("asset_id", assetId).eq("assigned_to", uid).is("returned_at", null);
          }
        }

        const returnFromName = employee?.name || employee?.email || employee?.id || "Unknown";
        await supabase.from("itam_asset_history").insert({
          asset_id: assetId, action: "returned_to_stock",
          old_value: returnFromName, new_value: "In Stock",
          details: { returned_from: returnFromName }, performed_by: user?.id,
        });
      }
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size} assets returned to stock`);
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employee-assigned-assets"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-history"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
      setSelectedIds(new Set());
      setBulkAction(null);
    },
    onError: (err: Error) => toast.error("Bulk return failed: " + err.message),
  });

  // Bulk reassign mutation — direct DB calls to avoid N toasts
  const bulkReassignMutation = useMutation({
    mutationFn: async ({ assetIds, newUserId, toLocation }: { assetIds: string[]; newUserId?: string; toLocation?: { siteId: string; locationId: string } }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const bulkFromName = employee?.name || employee?.email || employee?.id || "Unknown";
      const bulkFromEmail = employee?.email || null;

      for (const assetId of assetIds) {
        const { data: assetRec } = await supabase.from("itam_assets").select("asset_tag").eq("id", assetId).single();

        if (toLocation) {
          const loc = locations.find(l => l.id === toLocation.locationId);
          const site = sites.find(s => s.id === toLocation.siteId);
          const locationLabel = [site?.name, loc?.name].filter(Boolean).join(" — ");

          await supabase.from("itam_assets")
            .update({ assigned_to: null, checked_out_to: null, location_id: toLocation.locationId, status: ASSET_STATUS.AVAILABLE, updated_at: now })
            .eq("id", assetId);

          if (employee) {
            const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
            for (const uid of ids) {
              await supabase.from("itam_asset_assignments")
                .update({ returned_at: now, notes: `Reassigned to location: ${locationLabel}` }).eq("asset_id", assetId).eq("assigned_to", uid).is("returned_at", null);
            }
          }

          await supabase.from("itam_asset_history").insert({
            asset_id: assetId, action: "reassigned", old_value: bulkFromName, new_value: locationLabel,
            asset_tag: assetRec?.asset_tag || null,
            details: { from: bulkFromName, to: locationLabel, from_user_id: employee?.id, type: "location", reassign_date: now, reassign_type: "location", notes: bulkReassignNotes || undefined },
            performed_by: user?.id,
          });
        } else if (newUserId) {
          await supabase.from("itam_assets")
            .update({ assigned_to: newUserId, checked_out_to: newUserId, status: ASSET_STATUS.IN_USE, updated_at: now })
            .eq("id", assetId);

          if (employee) {
            const ids = [employee.id, employee.auth_user_id].filter(Boolean) as string[];
            for (const uid of ids) {
              await supabase.from("itam_asset_assignments")
                .update({ returned_at: now, notes: `Reassigned to another user` }).eq("asset_id", assetId).eq("assigned_to", uid).is("returned_at", null);
            }
          }

          await supabase.from("itam_asset_assignments").insert({
            asset_id: assetId, assigned_to: newUserId, assigned_by: user?.id || null, assigned_at: now, notes: bulkReassignNotes || null,
          });

          const bulkToUser = allUsers.find(u => u.id === newUserId);
          const bulkToName = bulkToUser?.name || bulkToUser?.email || newUserId;
          await supabase.from("itam_asset_history").insert({
            asset_id: assetId, action: "reassigned", old_value: bulkFromName, new_value: bulkToName,
            asset_tag: assetRec?.asset_tag || null,
            details: { from: bulkFromName, to: bulkToName, from_user_id: employee?.id, to_user_id: newUserId, user_id: newUserId, reassign_date: now, reassign_type: "person", notes: bulkReassignNotes || undefined },
            performed_by: user?.id,
          });
        }
      }

      // Send emails once after all assets processed (non-blocking, only if opted in)
      if (bulkSendEmail) {
        if (newUserId) {
          const bulkToUser = allUsers.find(u => u.id === newUserId);
          const bulkToName = bulkToUser?.name || bulkToUser?.email || newUserId;
          const bulkToEmail = bulkToUser?.email || null;
          if (bulkFromEmail) {
            supabase.functions.invoke("send-asset-email", {
              body: { templateId: "reassign_from", recipientEmail: bulkFromEmail, variables: { user_name: bulkFromName, new_assignee: bulkToName, asset_tag: `${assetIds.length} assets`, notes: bulkReassignNotes || "—" } },
            }).catch(e => console.warn("Bulk reassign email failed:", e));
          }
          if (bulkToEmail) {
            supabase.functions.invoke("send-asset-email", {
              body: { templateId: "reassign_to", recipientEmail: bulkToEmail, variables: { user_name: bulkToName, old_assignee: bulkFromName, asset_tag: `${assetIds.length} assets`, notes: bulkReassignNotes || "—" } },
            }).catch(e => console.warn("Bulk reassign email failed:", e));
          }
        } else if (toLocation && bulkFromEmail) {
          const loc = locations.find(l => l.id === toLocation.locationId);
          const site = sites.find(s => s.id === toLocation.siteId);
          const locationLabel = [site?.name, loc?.name].filter(Boolean).join(" — ");
          supabase.functions.invoke("send-asset-email", {
            body: { templateId: "reassign_from", recipientEmail: bulkFromEmail, variables: { user_name: bulkFromName, new_assignee: locationLabel, asset_tag: `${assetIds.length} assets`, notes: bulkReassignNotes || "—" } },
          }).catch(e => console.warn("Bulk reassign email failed:", e));
        }
      }
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size} assets reassigned`);
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["employee-assigned-assets"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-history"] });
      queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
      setSelectedIds(new Set());
      setBulkAction(null);
      setBulkReassignUserId("");
      setBulkReassignTo("person");
      setBulkReassignSiteId("");
      setBulkReassignLocationId("");
      setBulkReassignNotes("");
    },
    onError: (err: Error) => toast.error("Bulk reassign failed: " + err.message),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === assets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.map((a: any) => a.id)));
    }
  };

  const selectedAssets = useMemo(() => assets.filter((a: any) => selectedIds.has(a.id)), [assets, selectedIds]);

  const getColumnValue = useCallback((item: any, column: string): string | number => {
    switch (column) {
      case "name": return item.name || "";
      case "asset_tag": return item.asset_id || item.asset_tag || "";
      case "category": return item.category?.name || "";
      case "status": return item.status || "";
      default: return "";
    }
  }, []);

  const { sortedData: sortedAssets, sortConfig, handleSort } = useSortableAssets(assets, getColumnValue, { initialColumn: "name", initialDirection: "asc" });

  if (!employee) return null;

  const displayName = getUserDisplayName(employee) || employee.email;
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : employee.email[0].toUpperCase();

  // Deterministic avatar color
  const avatarColor = getAvatarColor(employee.name || employee.email);


  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelectedIds(new Set()); setReassignAsset(null); setReturnAsset(null); setBulkAction(null); setReassignUserId(""); setReassignTo("person"); setReassignSiteId(""); setReassignLocationId(""); setBulkReassignTo("person"); setBulkReassignUserId(""); setBulkReassignSiteId(""); setBulkReassignLocationId(""); } onOpenChange(o); }}>
        <DialogContent className="!fixed !left-[50%] !top-[50%] !-translate-x-1/2 !-translate-y-1/2 w-[95vw] max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {/* Merged header: avatar + name + info + confirm — single compact row */}
          <div className="px-3 pt-3 pb-2 pr-10 flex items-center gap-2.5 shrink-0">
            <Avatar className="h-7 w-7">
              <AvatarFallback className={`text-[10px] font-medium ${avatarColor}`}>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                <span>{employee.email}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${employee.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
                  {employee.status === "active" ? "Active" : "Inactive"}
                </span>
                <span>·</span>
                <span>{assets.length} asset{assets.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={assets.length === 0 || confirmWithUserMutation.isPending}
                    onClick={() => confirmWithUserMutation.mutate()}
                    className="h-7 text-xs gap-1 shrink-0"
                  >
                    {confirmWithUserMutation.isPending ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                    ) : (
                      <><ShieldCheck className="h-3 w-3" /> Confirm</>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send confirmation email to {displayName}</p>
                  {lastConfirmation && (
                    <p className="text-xs mt-1">
                      Last sent: {new Date(lastConfirmation.requested_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      {lastConfirmation.status === "completed" ? "✅ Completed" : lastConfirmation.status === "expired" ? "⏰ Expired" : "⏳ Pending"}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {hiddenAssetCount > 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <Checkbox
                  checked={includeHidden}
                  onCheckedChange={(checked) => setIncludeHidden(!!checked)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  <EyeOff className="h-3 w-3 inline mr-0.5" />
                  Include hidden ({hiddenAssetCount})
                </span>
              </label>
            )}
          </div>

          {/* Bulk Actions Bar — fixed */}
          {selectedIds.size > 0 && (
            <div className="px-3 py-1.5 bg-primary/5 border-y border-primary/20 flex items-center gap-2 shrink-0">
              <CheckSquare className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium">{selectedIds.size} selected</span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => setBulkAction("reassign")}>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Reassign
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setBulkAction("return")}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Return
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Scrollable records area */}
          <div className="flex-1 overflow-auto min-h-0 border-t border-border">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col style={{ width: "36px" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "60px" }} />
                <col style={{ width: "40px" }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-muted border-b shadow-sm">
                <tr>
                  <th className="px-2 py-1.5 text-left">
                    {assets.length > 0 && (
                      <Checkbox
                        checked={assets.length > 0 && selectedIds.size === assets.length}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    )}
                  </th>
                  <SortableTableHeader column="name" label="Name" sortConfig={sortConfig} onSort={handleSort} className="px-2 py-1.5" />
                  <SortableTableHeader column="asset_tag" label="Asset Tag" sortConfig={sortConfig} onSort={handleSort} className="px-2 py-1.5" />
                  <SortableTableHeader column="category" label="Category" sortConfig={sortConfig} onSort={handleSort} className="px-2 py-1.5" />
                  <SortableTableHeader column="status" label="Status" sortConfig={sortConfig} onSort={handleSort} className="px-2 py-1.5" />
                  <th className="px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-foreground/70">Confirmed</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto" />
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Package className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                      <p className="text-xs">No assets assigned</p>
                      <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => {
                        onOpenChange(false);
                        navigate(`/assets/checkout?user=${employee?.id}`);
                      }}>
                        <Package className="h-3 w-3 mr-1" />
                        Assign Asset
                      </Button>
                    </td>
                  </tr>
                ) : (
                  sortedAssets.map((asset: any) => (
                    <tr key={asset.id} className={`border-b last:border-0 transition-colors hover:bg-muted/50 ${selectedIds.has(asset.id) ? "bg-primary/5" : ""}`}>
                      <td className="px-2 py-1.5">
                        <Checkbox
                          checked={selectedIds.has(asset.id)}
                          onCheckedChange={() => toggleSelect(asset.id)}
                          aria-label={`Select ${asset.name}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-xs truncate">
                        {asset.name || "—"}
                        {asset.is_hidden && (
                          <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 gap-0.5 text-muted-foreground border-muted-foreground/30">
                            <EyeOff className="h-2.5 w-2.5" />
                            Hidden
                          </Badge>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          className="text-xs font-mono text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
                          onClick={() => {
                            onOpenChange(false);
                            navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`);
                          }}
                        >
                          {asset.asset_id || asset.asset_tag || "—"}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground truncate">{asset.category?.name || "—"}</td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs`}>
                          <span className={`h-2 w-2 rounded-full ${
                            asset.status === 'available' ? 'bg-emerald-500' :
                            asset.status === 'in_use' ? 'bg-sky-500' :
                            asset.status === 'maintenance' ? 'bg-amber-400' :
                            asset.status === 'disposed' ? 'bg-rose-500' : 'bg-muted-foreground'
                          }`} />
                          {getStatusLabel(asset.status)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {asset.confirmation_status === "confirmed" ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" />
                              ) : asset.confirmation_status === "denied" ? (
                                <XCircle className="h-3.5 w-3.5 text-destructive mx-auto" />
                              ) : (
                                <Minus className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {asset.confirmation_status === "confirmed" 
                                ? `Confirmed${asset.last_confirmed_at ? ` on ${new Date(asset.last_confirmed_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}` : ""}`
                                : asset.confirmation_status === "denied"
                                ? "Denied by user — needs review"
                                : "Not yet confirmed"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="px-2 py-1.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => {
                              onOpenChange(false);
                              navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`);
                            }}>
                              <ExternalLink className="h-3.5 w-3.5 mr-2" />
                              View Asset
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setReassignAsset(asset); setReassignUserId(""); setReassignTo("person"); setReassignSiteId(""); setReassignLocationId(""); }}>
                              <UserPlus className="h-3.5 w-3.5 mr-2" />
                              Reassign
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setReturnAsset(asset)}>
                              <RotateCcw className="h-3.5 w-3.5 mr-2" />
                              Return to Stock
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
                {history.length > 0 && (
                  <>
                    <tr><td colSpan={7} className="pt-4 pb-1 px-2 border-b-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Return History</span>
                    </td></tr>
                    <tr className="bg-muted/30">
                      <td className="px-2 py-1" colSpan={2}><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Asset</span></td>
                      <td className="px-2 py-1" colSpan={2}><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Assigned</span></td>
                      <td className="px-2 py-1" colSpan={3}><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Returned</span></td>
                    </tr>
                    {history.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0 text-muted-foreground">
                        <td className="px-2 py-1.5" colSpan={2}>
                          <p className="text-xs text-foreground">{item.asset?.name}</p>
                          <p className="text-[11px]">{item.asset?.asset_id || item.asset?.asset_tag}</p>
                        </td>
                        <td className="px-2 py-1.5 text-xs" colSpan={2}>
                          {item.assigned_at 
                            ? new Date(item.assigned_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                            : "-"}
                        </td>
                        <td className="px-2 py-1.5 text-xs" colSpan={3}>
                          {item.returned_at 
                            ? new Date(item.returned_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Fixed footer */}
          <DialogFooter className="px-3 py-1.5 border-t border-border shrink-0">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={!!reassignAsset} onOpenChange={(open) => { if (!open) { setReassignAsset(null); setReassignTo("person"); setReassignUserId(""); setReassignSiteId(""); setReassignLocationId(""); setReassignNotes(""); setSendEmailOnReassign(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Asset</DialogTitle>
            <DialogDescription>
              Reassign <span className="font-medium">{reassignAsset?.name}</span> to another user or location.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-2">
              <Label>Reassign to</Label>
              <RadioGroup value={reassignTo} onValueChange={(v) => { setReassignTo(v as "person" | "location"); setReassignUserId(""); setReassignSiteId(""); setReassignLocationId(""); }} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="person" id="emp-reassign-person" />
                  <Label htmlFor="emp-reassign-person" className="cursor-pointer font-normal">User</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="location" id="emp-reassign-location" />
                  <Label htmlFor="emp-reassign-location" className="cursor-pointer font-normal">Site / Location</Label>
                </div>
              </RadioGroup>
            </div>

            {reassignTo === "person" ? (
              <Select value={reassignUserId} onValueChange={setReassignUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers
                    .filter(u => u.id !== employee?.id && u.auth_user_id !== employee?.auth_user_id)
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email} {u.role ? `(${u.role})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Site</Label>
                  <Select value={reassignSiteId} onValueChange={(v) => { setReassignSiteId(v); setReassignLocationId(""); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select site (optional)" /></SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Location <span className="text-destructive">*</span></Label>
                  <Select value={reassignLocationId} onValueChange={setReassignLocationId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {filteredLocations.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}{l.itam_sites?.name ? ` (${l.itam_sites.name})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={reassignNotes} onChange={(e) => setReassignNotes(e.target.value)} placeholder="Reason for reassignment..." rows={2} className="text-xs" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emp-reassign-send-email"
                  checked={sendEmailOnReassign}
                  onCheckedChange={(checked) => setSendEmailOnReassign(!!checked)}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="emp-reassign-send-email" className="text-xs font-normal cursor-pointer">
                  Send email notification to user
                </Label>
              </div>
              {sendEmailOnReassign && (() => {
                const emails: string[] = [];
                if (employee?.email) emails.push(employee.email);
                if (reassignTo === "person" && reassignUserId) {
                  const toUser = allUsers.find(u => u.id === reassignUserId);
                  if (toUser?.email) emails.push(toUser.email);
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
            <Button variant="outline" onClick={() => setReassignAsset(null)}>Cancel</Button>
            <Button
              disabled={(reassignTo === "person" ? !reassignUserId : !reassignLocationId) || reassignMutation.isPending}
              onClick={() => {
                if (!reassignAsset) return;
                if (reassignTo === "person") {
                  reassignMutation.mutate({ assetId: reassignAsset.id, newUserId: reassignUserId });
                } else {
                  reassignMutation.mutate({ assetId: reassignAsset.id, toLocation: { siteId: reassignSiteId, locationId: reassignLocationId } });
                }
              }}
            >
              {reassignMutation.isPending ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return to Stock Confirmation */}
      <ConfirmDialog
        open={!!returnAsset}
        onOpenChange={(open) => { if (!open) setReturnAsset(null); }}
        onConfirm={() => returnAsset && returnMutation.mutate(returnAsset.id)}
        title="Return to Stock"
        description={`Return "${returnAsset?.name}" to available stock? This will unassign it from ${employee?.name || employee?.email}.`}
        confirmText={returnMutation.isPending ? "Returning..." : "Return to Stock"}
        variant="destructive"
      />

      {/* Bulk Reassign Dialog */}
      <Dialog open={bulkAction === "reassign"} onOpenChange={(o) => { if (!o) { setBulkAction(null); setBulkReassignUserId(""); setBulkReassignTo("person"); setBulkReassignSiteId(""); setBulkReassignLocationId(""); setBulkReassignNotes(""); setBulkSendEmail(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Reassign Assets</DialogTitle>
            <DialogDescription>
              Reassign {selectedIds.size} selected asset{selectedIds.size !== 1 ? 's' : ''} to another user or location.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
              {selectedAssets.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">({a.asset_id || a.asset_tag})</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Reassign to</Label>
              <RadioGroup value={bulkReassignTo} onValueChange={(v) => { setBulkReassignTo(v as "person" | "location"); setBulkReassignUserId(""); setBulkReassignSiteId(""); setBulkReassignLocationId(""); }} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="person" id="bulk-reassign-person" />
                  <Label htmlFor="bulk-reassign-person" className="cursor-pointer font-normal">User</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="location" id="bulk-reassign-location" />
                  <Label htmlFor="bulk-reassign-location" className="cursor-pointer font-normal">Site / Location</Label>
                </div>
              </RadioGroup>
            </div>

            {bulkReassignTo === "person" ? (
              <Select value={bulkReassignUserId} onValueChange={setBulkReassignUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers
                    .filter(u => u.id !== employee?.id && u.auth_user_id !== employee?.auth_user_id)
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email} {u.role ? `(${u.role})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Site</Label>
                  <Select value={bulkReassignSiteId} onValueChange={(v) => { setBulkReassignSiteId(v); setBulkReassignLocationId(""); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select site (optional)" /></SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Location <span className="text-destructive">*</span></Label>
                  <Select value={bulkReassignLocationId} onValueChange={setBulkReassignLocationId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {bulkFilteredLocations.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}{l.itam_sites?.name ? ` (${l.itam_sites.name})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={bulkReassignNotes} onChange={(e) => setBulkReassignNotes(e.target.value)} placeholder="Reason for reassignment..." rows={2} className="text-xs" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bulk-reassign-send-email"
                  checked={bulkSendEmail}
                  onCheckedChange={(checked) => setBulkSendEmail(!!checked)}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="bulk-reassign-send-email" className="text-xs font-normal cursor-pointer">
                  Send email notification to user
                </Label>
              </div>
              {bulkSendEmail && (() => {
                const emails: string[] = [];
                if (employee?.email) emails.push(employee.email);
                if (bulkReassignTo === "person" && bulkReassignUserId) {
                  const toUser = allUsers.find(u => u.id === bulkReassignUserId);
                  if (toUser?.email) emails.push(toUser.email);
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
            <Button variant="outline" onClick={() => { setBulkAction(null); setBulkReassignUserId(""); setBulkReassignTo("person"); setBulkReassignSiteId(""); setBulkReassignLocationId(""); setBulkReassignNotes(""); setBulkSendEmail(false); }}>Cancel</Button>
            <Button
              disabled={(bulkReassignTo === "person" ? !bulkReassignUserId : !bulkReassignLocationId) || bulkReassignMutation.isPending}
              onClick={() => {
                if (bulkReassignTo === "person") {
                  bulkReassignMutation.mutate({ assetIds: Array.from(selectedIds), newUserId: bulkReassignUserId });
                } else {
                  bulkReassignMutation.mutate({ assetIds: Array.from(selectedIds), toLocation: { siteId: bulkReassignSiteId, locationId: bulkReassignLocationId } });
                }
              }}
            >
              {bulkReassignMutation.isPending ? "Reassigning..." : `Reassign ${selectedIds.size} Asset${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Return Confirmation */}
      <ConfirmDialog
        open={bulkAction === "return"}
        onOpenChange={(o) => { if (!o) setBulkAction(null); }}
        onConfirm={() => bulkReturnMutation.mutate(Array.from(selectedIds))}
        title="Bulk Return to Stock"
        description={`Return ${selectedIds.size} selected asset${selectedIds.size !== 1 ? 's' : ''} to available stock? This will unassign them from ${employee?.name || employee?.email}.`}
        confirmText={bulkReturnMutation.isPending ? "Returning..." : `Return ${selectedIds.size} Asset${selectedIds.size !== 1 ? 's' : ''}`}
        variant="destructive"
      />
    </>
  );
}
