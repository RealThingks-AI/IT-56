import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useVerificationConfig, VerificationConfig } from "@/hooks/assets/useVerificationConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VerificationSettingsDialog({ open, onOpenChange }: Props) {
  const { config, isLoading, saveConfig, isSaving } = useVerificationConfig();
  const [form, setForm] = useState<VerificationConfig>(config);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    if (open) setForm(config);
  }, [open, config]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-for-exclusion"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email").eq("status", "active").order("name");
      return data || [];
    },
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const filteredUsers = useMemo(() => {
    if (!userSearch) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(u => (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q));
  }, [allUsers, userSearch]);

  const update = <K extends keyof VerificationConfig>(key: K, value: VerificationConfig[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleExcludedUser = (userId: string) => {
    setForm(prev => {
      const current = prev.excluded_user_ids || [];
      const next = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
      return { ...prev, excluded_user_ids: next };
    });
  };

  const removeExcludedUser = (userId: string) => {
    setForm(prev => ({
      ...prev,
      excluded_user_ids: (prev.excluded_user_ids || []).filter(id => id !== userId),
    }));
  };

  const handleSave = async () => {
    try {
      await saveConfig(form);
      toast.success("Verification settings saved");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const excludedUsers = (form.excluded_user_ids || []);
  const excludedUserDetails = allUsers.filter(u => excludedUsers.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Verification Settings</DialogTitle>
          <DialogDescription>Configure asset verification rules and notification preferences.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 py-2">
              {/* Verification Period */}
              <div className="space-y-1.5">
                <Label htmlFor="vp">Verification Period (days)</Label>
                <Input
                  id="vp"
                  type="number"
                  min={1}
                  max={365}
                  value={form.verification_period}
                  onChange={e => update("verification_period", Math.max(1, parseInt(e.target.value) || 60))}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">Assets become overdue after this many days since last verification.</p>
              </div>

              {/* Grace Period */}
              <div className="space-y-1.5">
                <Label htmlFor="gp">Grace Period (days)</Label>
                <Input
                  id="gp"
                  type="number"
                  min={0}
                  max={90}
                  value={form.grace_period}
                  onChange={e => update("grace_period", Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">Extra days after overdue before flagging as critical.</p>
              </div>

              {/* Auto-send Reminders */}
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Auto-send Reminders</Label>
                  <p className="text-xs text-muted-foreground">Automatically email users when assets become overdue.</p>
                </div>
                <Switch checked={form.auto_send_reminders} onCheckedChange={v => update("auto_send_reminders", v)} />
              </div>

              {/* Reminder Frequency */}
              {form.auto_send_reminders && (
                <div className="space-y-1.5 pl-1">
                  <Label>Reminder Frequency</Label>
                  <Select value={String(form.reminder_frequency)} onValueChange={v => update("reminder_frequency", parseInt(v))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Every 7 days</SelectItem>
                      <SelectItem value="14">Every 14 days</SelectItem>
                      <SelectItem value="30">Every 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Excluded Users */}
              {form.auto_send_reminders && (
                <div className="space-y-2 pl-1">
                  <Label>Excluded Users</Label>
                  <p className="text-xs text-muted-foreground">These users will never receive auto-send reminders.</p>

                  {/* Selected excluded users as badges */}
                  {excludedUserDetails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {excludedUserDetails.map(u => (
                        <Badge key={u.id} variant="secondary" className="gap-1 pr-1 text-xs">
                          {u.name || u.email}
                          <button
                            type="button"
                            onClick={() => removeExcludedUser(u.id)}
                            className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Search + user list */}
                  <div className="rounded-md border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="h-8 pl-7 text-xs border-0 border-b rounded-b-none focus-visible:ring-0"
                      />
                    </div>
                    <ScrollArea className="h-[120px]">
                      <div className="p-1">
                        {filteredUsers.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">No users found</p>
                        ) : (
                          filteredUsers.map(u => (
                            <label
                              key={u.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-xs"
                            >
                              <Checkbox
                                checked={excludedUsers.includes(u.id)}
                                onCheckedChange={() => toggleExcludedUser(u.id)}
                              />
                              <span className="truncate">{u.name || u.email}</span>
                              {u.name && <span className="text-muted-foreground truncate ml-auto text-[10px]">{u.email}</span>}
                            </label>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Include Unassigned */}
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Include Unassigned Assets</Label>
                  <p className="text-xs text-muted-foreground">Require periodic verification for in-stock assets too.</p>
                </div>
                <Switch checked={form.include_unassigned} onCheckedChange={v => update("include_unassigned", v)} />
              </div>

              {/* Notify on Denial */}
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Email on Denial</Label>
                  <p className="text-xs text-muted-foreground">Notify admins when a user denies asset confirmation.</p>
                </div>
                <Switch checked={form.notify_on_denial} onCheckedChange={v => update("notify_on_denial", v)} />
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
