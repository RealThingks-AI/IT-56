import { useState, useEffect } from "react";
import { SettingsCard } from "./SettingsCard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Monitor, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

export function MyAccountNotifications() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("notification-preferences");
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch {
        // Use defaults
      }
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem("notification-preferences", JSON.stringify(preferences));
      toast.success("Notification preferences saved");
      setIsSaving(false);
    }, 500);
  };

  const updateModuleNotification = (key: keyof typeof preferences.moduleNotifications, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      moduleNotifications: { ...prev.moduleNotifications, [key]: value },
    }));
  };

  const updateEventTrigger = (key: keyof typeof preferences.eventTriggers, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      eventTriggers: { ...prev.eventTriggers, [key]: value },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Delivery Preferences */}
      <SettingsCard
        title="Delivery Preferences"
        description="Configure how you receive notifications"
        icon={Bell}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Delivery Frequency</Label>
            <Select
              value={preferences.deliveryFrequency}
              onValueChange={(value) =>
                setPreferences((prev) => ({ ...prev, deliveryFrequency: value }))
              }
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
                  <p className="text-xs text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.emailEnabled}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, emailEnabled: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">In-App Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Show notifications within the application
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.inAppEnabled}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, inAppEnabled: checked }))
                }
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Module Notifications */}
      <SettingsCard
        title="Module Notifications"
        description="Choose which modules send you notifications"
        icon={Bell}
      >
        <div className="space-y-4">
          {[
            { key: "tickets" as const, label: "Tickets", description: "Helpdesk ticket updates" },
            { key: "assets" as const, label: "Assets", description: "Asset management alerts" },
            { key: "systemUpdates" as const, label: "System Updates", description: "Windows update tracking" },
            { key: "subscriptions" as const, label: "Subscriptions", description: "Subscription renewals and payments" },
            { key: "monitoring" as const, label: "Monitoring", description: "Service health and incidents" },
          ].map((module) => (
            <div key={module.key} className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm">{module.label}</Label>
                <p className="text-xs text-muted-foreground">{module.description}</p>
              </div>
              <Switch
                checked={preferences.moduleNotifications[module.key]}
                onCheckedChange={(checked) => updateModuleNotification(module.key, checked)}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Event Triggers */}
      <SettingsCard
        title="Event Triggers"
        description="Configure notifications for specific events"
        icon={Bell}
      >
        <div className="space-y-4">
          {[
            { key: "ticketAssigned" as const, label: "Ticket Assigned", description: "When a ticket is assigned to you" },
            { key: "ticketUpdated" as const, label: "Ticket Updated", description: "When your assigned tickets are updated" },
            { key: "slaBreaching" as const, label: "SLA Breaching", description: "When SLA is about to breach" },
            { key: "assetExpiring" as const, label: "Asset Expiring", description: "When warranties or licenses expire" },
            { key: "weeklyDigest" as const, label: "Weekly Digest", description: "Weekly summary of activity" },
          ].map((event) => (
            <div key={event.key} className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm">{event.label}</Label>
                <p className="text-xs text-muted-foreground">{event.description}</p>
              </div>
              <Switch
                checked={preferences.eventTriggers[event.key]}
                onCheckedChange={(checked) => updateEventTrigger(event.key, checked)}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
