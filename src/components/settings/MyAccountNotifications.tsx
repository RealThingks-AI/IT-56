import { useState, useEffect, useCallback } from "react";
import { SettingsCard } from "./SettingsCard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Monitor, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface NotificationPreferences {
  deliveryFrequency: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  moduleNotifications: {
    tickets: boolean;
    assets: boolean;
    systemUpdates: boolean;
    subscriptions: boolean;
    monitoring: boolean;
  };
  eventTriggers: {
    ticketAssigned: boolean;
    ticketUpdated: boolean;
    slaBreaching: boolean;
    assetExpiring: boolean;
    weeklyDigest: boolean;
  };
}

const defaultPreferences: NotificationPreferences = {
  deliveryFrequency: "instant",
  emailEnabled: true,
  inAppEnabled: true,
  moduleNotifications: {
    tickets: true,
    assets: true,
    systemUpdates: true,
    subscriptions: true,
    monitoring: true,
  },
  eventTriggers: {
    ticketAssigned: true,
    ticketUpdated: true,
    slaBreaching: true,
    assetExpiring: true,
    weeklyDigest: false,
  },
};

const MODULE_ITEMS = [
  { key: "tickets" as const, label: "Tickets", description: "Helpdesk ticket updates" },
  { key: "assets" as const, label: "Assets", description: "Asset management alerts" },
  { key: "systemUpdates" as const, label: "System Updates", description: "Windows update tracking" },
  { key: "subscriptions" as const, label: "Subscriptions", description: "Subscription renewals and payments" },
  { key: "monitoring" as const, label: "Monitoring", description: "Service health and incidents" },
] as const;

const EVENT_ITEMS = [
  { key: "ticketAssigned" as const, label: "Ticket Assigned", description: "When a ticket is assigned to you" },
  { key: "ticketUpdated" as const, label: "Ticket Updated", description: "When your assigned tickets are updated" },
  { key: "slaBreaching" as const, label: "SLA Breaching", description: "When SLA is about to breach" },
  { key: "assetExpiring" as const, label: "Asset Expiring", description: "When warranties or licenses expire" },
  { key: "weeklyDigest" as const, label: "Weekly Digest", description: "Weekly summary of activity" },
] as const;

export function MyAccountNotifications() {
  const { preferences: userPrefs, updatePreferences, isLoading: prefsLoading } = useUserPreferences();
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from DB notification_settings
  useEffect(() => {
    if (!loaded && userPrefs?.notification_settings) {
      const ns = userPrefs.notification_settings as any;
      setPrefs({
        deliveryFrequency: ns.deliveryFrequency || defaultPreferences.deliveryFrequency,
        emailEnabled: userPrefs.email_notifications ?? defaultPreferences.emailEnabled,
        inAppEnabled: userPrefs.in_app_notifications ?? defaultPreferences.inAppEnabled,
        moduleNotifications: { ...defaultPreferences.moduleNotifications, ...ns.moduleNotifications },
        eventTriggers: { ...defaultPreferences.eventTriggers, ...ns.eventTriggers },
      });
      setLoaded(true);
    }
  }, [userPrefs, loaded]);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    updatePreferences.mutate(
      {
        email_notifications: prefs.emailEnabled,
        in_app_notifications: prefs.inAppEnabled,
        notification_settings: {
          deliveryFrequency: prefs.deliveryFrequency,
          moduleNotifications: prefs.moduleNotifications,
          eventTriggers: prefs.eventTriggers,
        },
      },
      {
        onSuccess: () => {
          toast.success("Notification preferences saved");
          setIsSaving(false);
        },
        onError: () => setIsSaving(false),
      }
    );
  }, [prefs, updatePreferences]);

  const updateModuleNotification = (key: keyof typeof prefs.moduleNotifications, value: boolean) => {
    setPrefs((prev) => ({
      ...prev,
      moduleNotifications: { ...prev.moduleNotifications, [key]: value },
    }));
  };

  const updateEventTrigger = (key: keyof typeof prefs.eventTriggers, value: boolean) => {
    setPrefs((prev) => ({
      ...prev,
      eventTriggers: { ...prev.eventTriggers, [key]: value },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Delivery Preferences */}
      <SettingsCard title="Delivery Preferences" description="Configure how you receive notifications" icon={Bell}>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Delivery Frequency</Label>
            <Select
              value={prefs.deliveryFrequency}
              onValueChange={(value) => setPrefs((prev) => ({ ...prev, deliveryFrequency: value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="hourly">Hourly Digest</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Delivery Methods</h4>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                </div>
              </div>
              <Switch
                checked={prefs.emailEnabled}
                onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, emailEnabled: checked }))}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">In-App Notifications</Label>
                  <p className="text-xs text-muted-foreground">Show notifications within the application</p>
                </div>
              </div>
              <Switch
                checked={prefs.inAppEnabled}
                onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, inAppEnabled: checked }))}
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Module Notifications */}
      <SettingsCard title="Module Notifications" description="Choose which modules send you notifications" icon={Bell}>
        <div className="space-y-4">
          {MODULE_ITEMS.map((module) => (
            <div key={module.key} className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm">{module.label}</Label>
                <p className="text-xs text-muted-foreground">{module.description}</p>
              </div>
              <Switch
                checked={prefs.moduleNotifications[module.key]}
                onCheckedChange={(checked) => updateModuleNotification(module.key, checked)}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Event Triggers */}
      <SettingsCard title="Event Triggers" description="Configure notifications for specific events" icon={Bell}>
        <div className="space-y-4">
          {EVENT_ITEMS.map((event) => (
            <div key={event.key} className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm">{event.label}</Label>
                <p className="text-xs text-muted-foreground">{event.description}</p>
              </div>
              <Switch
                checked={prefs.eventTriggers[event.key]}
                onCheckedChange={(checked) => updateEventTrigger(event.key, checked)}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || prefsLoading}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
