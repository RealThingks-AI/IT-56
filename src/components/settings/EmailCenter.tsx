import { useState } from "react";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Send, FileText, TestTube, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SmtpConfig {
  host: string;
  port: string;
  username: string;
  encryption: string;
  enabled: boolean;
}

export function EmailCenter() {
  const [config, setConfig] = useState<SmtpConfig>({
    host: "",
    port: "587",
    username: "",
    encryption: "tls",
    enabled: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleTestConnection = () => {
    setIsTesting(true);
    setTimeout(() => {
      toast.info("Email configuration testing is not yet available");
      setIsTesting(false);
    }, 1000);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      toast.success("Email settings saved (demo only)");
      setIsSaving(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* SMTP Configuration */}
      <SettingsCard
        title="SMTP Configuration"
        description="Configure your email server settings for sending notifications"
        icon={Mail}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm">Enable Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Turn on to send emails for tickets, alerts, and reports
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                value={config.host}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, host: e.target.value }))
                }
                placeholder="smtp.example.com"
                disabled={!config.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                value={config.port}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, port: e.target.value }))
                }
                placeholder="587"
                disabled={!config.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Username / Email</Label>
              <Input
                id="smtp-user"
                value={config.username}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, username: e.target.value }))
                }
                placeholder="noreply@example.com"
                disabled={!config.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Encryption</Label>
              <Select
                value={config.encryption}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, encryption: value }))
                }
                disabled={!config.enabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select encryption" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!config.enabled || isTesting}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
            <Button onClick={handleSave} disabled={!config.enabled || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          </div>
        </div>
      </SettingsCard>

      {/* Email Templates */}
      <SettingsCard
        title="Email Templates"
        description="Customize email templates for different notifications"
        icon={FileText}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="text-lg font-medium mb-1">Email Templates Coming Soon</h4>
          <p className="text-sm text-muted-foreground max-w-sm">
            Customize email templates for ticket notifications, password resets,
            weekly digests, and more.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
