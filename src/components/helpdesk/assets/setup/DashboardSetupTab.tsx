import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const DEFAULT_WIDGETS = [
  { key: "total_assets", label: "Total Assets", default: true },
  { key: "checked_out", label: "Checked Out Assets", default: true },
  { key: "available", label: "Available Assets", default: true },
  { key: "maintenance_due", label: "Maintenance Due", default: true },
  { key: "warranty_expiring", label: "Warranty Expiring", default: true },
  { key: "assets_by_category", label: "Assets by Category Chart", default: true },
  { key: "assets_by_status", label: "Assets by Status Chart", default: false },
  { key: "assets_by_location", label: "Assets by Location Chart", default: false },
  { key: "recent_activity", label: "Recent Activity", default: true },
  { key: "upcoming_events", label: "Upcoming Events", default: false },
];

export function DashboardSetupTab() {
  const queryClient = useQueryClient();
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(
    DEFAULT_WIDGETS.filter(w => w.default).map(w => w.key)
  );

  const { data: settings, isLoading } = useQuery({
    queryKey: ["itam-settings", "dashboard_widgets"],
    queryFn: async () => {
      // @ts-ignore - Bypass complex type inference
      const { data } = await supabase
        .from("itam_settings")
        .select("value")
        .eq("key", "dashboard_widgets")
        .maybeSingle();

      return data?.value as { enabled_widgets?: string[] } | null;
    },
  });

  useEffect(() => {
    if (settings?.enabled_widgets) {
      setEnabledWidgets(settings.enabled_widgets);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // @ts-ignore - Bypass complex type inference
      const { data: existing } = await supabase
        .from("itam_settings")
        .select("id")
        .eq("key", "dashboard_widgets")
        .maybeSingle();

      if (existing) {
        // @ts-ignore - Bypass complex type inference
        const { error } = await supabase
          .from("itam_settings")
          .update({ value: { enabled_widgets: enabledWidgets } })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // @ts-ignore - Bypass complex type inference
        const { error } = await supabase
          .from("itam_settings")
          .insert({
            key: "dashboard_widgets",
            value: { enabled_widgets: enabledWidgets },
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Dashboard settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-settings", "dashboard_widgets"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const handleWidgetToggle = (key: string, checked: boolean) => {
    if (checked) {
      setEnabledWidgets([...enabledWidgets, key]);
    } else {
      setEnabledWidgets(enabledWidgets.filter(w => w !== key));
    }
  };

  const resetToDefaults = () => {
    setEnabledWidgets(DEFAULT_WIDGETS.filter(w => w.default).map(w => w.key));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Manage Dashboard
        </CardTitle>
        <CardDescription className="text-xs">
          Choose which widgets to display on the asset dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_WIDGETS.map((widget) => (
            <div key={widget.key} className="flex items-center space-x-2 p-2 border rounded-lg">
              <Checkbox
                id={widget.key}
                checked={enabledWidgets.includes(widget.key)}
                onCheckedChange={(checked) => handleWidgetToggle(widget.key, checked as boolean)}
              />
              <Label htmlFor={widget.key} className="text-sm cursor-pointer flex-1">
                {widget.label}
              </Label>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
