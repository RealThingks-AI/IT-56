import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Server, Database, Globe, Cpu, HardDrive, Activity } from "lucide-react";

interface AddMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (monitor: any) => void;
}

export function AddMonitorDialog({ open, onOpenChange, onAdd }: AddMonitorDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "server",
    endpoint: "",
    checkInterval: "60",
    threshold: "",
    description: "",
  });

  const monitorTypes = [
    { value: "server", label: "Server", icon: Server },
    { value: "database", label: "Database", icon: Database },
    { value: "api", label: "API Endpoint", icon: Globe },
    { value: "cpu", label: "CPU Usage", icon: Cpu },
    { value: "memory", label: "Memory", icon: HardDrive },
    { value: "service", label: "Service", icon: Activity },
  ];

  const handleSubmit = () => {
    onAdd(formData);
    setFormData({
      name: "",
      type: "server",
      endpoint: "",
      checkInterval: "60",
      threshold: "",
      description: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Monitor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Monitor Name</Label>
            <Input
              placeholder="e.g., Production API"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Monitor Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monitorTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Endpoint / Target</Label>
            <Input
              placeholder="https://api.example.com or server-name"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check Interval (seconds)</Label>
              <Input
                type="number"
                placeholder="60"
                value={formData.checkInterval}
                onChange={(e) => setFormData({ ...formData, checkInterval: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Alert Threshold</Label>
              <Input
                placeholder="e.g., 90 for 90%"
                value={formData.threshold}
                onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="Additional details about this monitor..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name || !formData.endpoint}>
            Add Monitor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
