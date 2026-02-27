import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormInput, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const FORM_FIELDS = [
  { key: "name", label: "Asset Name", required: true, canHide: false },
  { key: "asset_id", label: "Asset ID", required: false, canHide: false },
  { key: "category_id", label: "Category", required: true, canHide: false },
  { key: "location_id", label: "Location", required: false, canHide: true },
  { key: "department_id", label: "Department", required: false, canHide: true },
  { key: "site_id", label: "Site", required: false, canHide: true },
  { key: "make_id", label: "Make", required: false, canHide: true },
  { key: "model", label: "Model", required: false, canHide: true },
  { key: "serial_number", label: "Serial Number", required: false, canHide: true },
  { key: "purchase_date", label: "Purchase Date", required: false, canHide: true },
  { key: "purchase_cost", label: "Purchase Cost", required: false, canHide: true },
  { key: "warranty_end_date", label: "Warranty End Date", required: false, canHide: true },
  { key: "notes", label: "Notes", required: false, canHide: true },
];

interface FormSettings {
  required_fields: string[];
  hidden_fields: string[];
}

export function FormsTab() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FormSettings>({
    required_fields: ["name", "category_id"],
    hidden_fields: [],
  });

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["itam-settings", "asset_form_settings"],
    queryFn: async () => {
      // @ts-ignore - Bypass complex type inference
      const { data } = await supabase
        .from("itam_settings")
        .select("value")
        .eq("key", "asset_form_settings")
        .maybeSingle();

      return data?.value as unknown as FormSettings | null;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        required_fields: savedSettings.required_fields || ["name", "category_id"],
        hidden_fields: savedSettings.hidden_fields || [],
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // @ts-ignore - Bypass complex type inference
      const { data: existing } = await supabase
        .from("itam_settings")
        .select("id")
        .eq("key", "asset_form_settings")
        .maybeSingle();

      if (existing) {
        // @ts-ignore - Bypass complex type inference
        const { error } = await supabase
          .from("itam_settings")
          .update({ value: JSON.parse(JSON.stringify(settings)) })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // @ts-ignore - Bypass complex type inference
        const { error } = await supabase
          .from("itam_settings")
          .insert([{
            key: "asset_form_settings",
            value: JSON.parse(JSON.stringify(settings)),
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Form settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-settings", "asset_form_settings"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const handleRequiredToggle = (key: string, checked: boolean) => {
    const field = FORM_FIELDS.find(f => f.key === key);
    if (field && field.required && !checked) return; // Can't uncheck if always required
    
    if (checked) {
      setSettings({
        ...settings,
        required_fields: [...settings.required_fields, key],
        hidden_fields: settings.hidden_fields.filter(f => f !== key), // Can't be hidden if required
      });
    } else {
      setSettings({
        ...settings,
        required_fields: settings.required_fields.filter(f => f !== key),
      });
    }
  };

  const handleHiddenToggle = (key: string, checked: boolean) => {
    if (checked) {
      setSettings({
        ...settings,
        hidden_fields: [...settings.hidden_fields, key],
        required_fields: settings.required_fields.filter(f => f !== key), // Can't be required if hidden
      });
    } else {
      setSettings({
        ...settings,
        hidden_fields: settings.hidden_fields.filter(f => f !== key),
      });
    }
  };

  const resetToDefaults = () => {
    setSettings({
      required_fields: ["name", "category_id"],
      hidden_fields: [],
    });
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
          <FormInput className="h-4 w-4" />
          Customize Forms
        </CardTitle>
        <CardDescription className="text-xs">
          Configure which fields are required or hidden in the asset form
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Field</th>
                <th className="text-center p-3 font-medium w-24">Required</th>
                <th className="text-center p-3 font-medium w-24">Hidden</th>
              </tr>
            </thead>
            <tbody>
              {FORM_FIELDS.map((field) => (
                <tr key={field.key} className="border-t">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {field.label}
                      {field.required && (
                        <Badge variant="secondary" className="text-xs">
                          Always Required
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="text-center p-3">
                    <Checkbox
                      checked={settings.required_fields.includes(field.key) || field.required}
                      onCheckedChange={(checked) => handleRequiredToggle(field.key, checked as boolean)}
                      disabled={field.required || settings.hidden_fields.includes(field.key)}
                    />
                  </td>
                  <td className="text-center p-3">
                    <Checkbox
                      checked={settings.hidden_fields.includes(field.key)}
                      onCheckedChange={(checked) => handleHiddenToggle(field.key, checked as boolean)}
                      disabled={!field.canHide || settings.required_fields.includes(field.key)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
