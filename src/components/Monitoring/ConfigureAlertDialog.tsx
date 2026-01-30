import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ConfigureAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitorName?: string;
  onSave: (config: any) => void;
}

export function ConfigureAlertDialog({ open, onOpenChange, monitorName, onSave }: ConfigureAlertDialogProps) {
  const [config, setConfig] = useState({
    enabled: true,
    warningThreshold: "",
    criticalThreshold: "",
    checkInterval: "60",
    notifyEmail: true,
    notifySlack: false,
    recipients: "",
    escalationDelay: "15",
    autoResolve: true,
    notes: "",
  });

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Alert Rules</DialogTitle>
          {monitorName && (
            <p className="text-sm text-muted-foreground">Monitor: {monitorName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Monitoring</Label>
              <p className="text-xs text-muted-foreground">Start monitoring and alerting</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Warning Threshold</Label>
              <Input
                type="number"
                placeholder="e.g., 70"
                value={config.warningThreshold}
                onChange={(e) => setConfig({ ...config, warningThreshold: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Trigger warning alert at this level
              </p>
            </div>

            <div>
              <Label>Critical Threshold</Label>
              <Input
                type="number"
                placeholder="e.g., 90"
                value={config.criticalThreshold}
                onChange={(e) => setConfig({ ...config, criticalThreshold: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Trigger critical alert at this level
              </p>
            </div>
          </div>

          <div>
            <Label>Check Interval (seconds)</Label>
            <Select 
              value={config.checkInterval} 
              onValueChange={(value) => setConfig({ ...config, checkInterval: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="600">10 minutes</SelectItem>
                <SelectItem value="1800">30 minutes</SelectItem>
                <SelectItem value="3600">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Notification Channels</Label>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Send alerts via email</p>
              </div>
              <Switch
                checked={config.notifyEmail}
                onCheckedChange={(checked) => setConfig({ ...config, notifyEmail: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Slack Notifications</p>
                <p className="text-xs text-muted-foreground">Send alerts to Slack</p>
              </div>
              <Switch
                checked={config.notifySlack}
                onCheckedChange={(checked) => setConfig({ ...config, notifySlack: checked })}
              />
            </div>
          </div>

          {config.notifyEmail && (
            <div>
              <Label>Email Recipients</Label>
              <Input
                placeholder="admin@example.com, ops@example.com"
                value={config.recipients}
                onChange={(e) => setConfig({ ...config, recipients: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated email addresses
              </p>
            </div>
          )}

          <div>
            <Label>Escalation Delay (minutes)</Label>
            <Input
              type="number"
              placeholder="15"
              value={config.escalationDelay}
              onChange={(e) => setConfig({ ...config, escalationDelay: e.target.value })}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Time before escalating unacknowledged alerts
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Resolve</Label>
              <p className="text-xs text-muted-foreground">
                Automatically resolve when metric returns to normal
              </p>
            </div>
            <Switch
              checked={config.autoResolve}
              onCheckedChange={(checked) => setConfig({ ...config, autoResolve: checked })}
            />
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Configuration notes, runbooks, or escalation procedures..."
              value={config.notes}
              onChange={(e) => setConfig({ ...config, notes: e.target.value })}
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
