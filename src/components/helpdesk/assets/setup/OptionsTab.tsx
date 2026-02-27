import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sliders, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface AssetOptions {
  require_checkout_notes: boolean;
  auto_generate_asset_tag: boolean;
  default_depreciation_method: string;
  require_purchase_info: boolean;
  enable_qr_codes: boolean;
}

const DEFAULT_OPTIONS: AssetOptions = {
  require_checkout_notes: false,
  auto_generate_asset_tag: true,
  default_depreciation_method: "straight_line",
  require_purchase_info: false,
  enable_qr_codes: true,
};

export function OptionsTab() {
  const queryClient = useQueryClient();
  const [options, setOptions] = useState<AssetOptions>(DEFAULT_OPTIONS);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["itam-settings", "asset_options"],
    queryFn: async () => {
      // @ts-ignore - Bypass complex type inference
      const { data } = await supabase
        .from("itam_settings")
        .select("value")
        .eq("key", "asset_options")
        .maybeSingle();

      return data?.value as unknown as AssetOptions | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setOptions({ ...DEFAULT_OPTIONS, ...settings });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // @ts-ignore - Bypass complex type inference
      const { data: existing } = await supabase
        .from("itam_settings")
        .select("id")
        .eq("key", "asset_options")
        .maybeSingle();

      if (existing) {
        // @ts-ignore - Bypass complex type inference
        const { error } = await supabase
          .from("itam_settings")
          .update({ value: JSON.parse(JSON.stringify(options)) })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // @ts-ignore - Bypass complex type inference
        const { error } = await supabase
          .from("itam_settings")
          .insert([{
            key: "asset_options",
            value: JSON.parse(JSON.stringify(options)),
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Options saved successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-settings", "asset_options"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

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
          <Sliders className="h-4 w-4" />
          General Options
        </CardTitle>
        <CardDescription className="text-xs">
          Configure general asset module settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-generate Asset Tags</Label>
              <p className="text-xs text-muted-foreground">
                Automatically generate asset IDs when adding new assets
              </p>
            </div>
            <Switch
              checked={options.auto_generate_asset_tag}
              onCheckedChange={(checked) =>
                setOptions({ ...options, auto_generate_asset_tag: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Checkout Notes</Label>
              <p className="text-xs text-muted-foreground">
                Require notes when checking out assets to users
              </p>
            </div>
            <Switch
              checked={options.require_checkout_notes}
              onCheckedChange={(checked) =>
                setOptions({ ...options, require_checkout_notes: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Purchase Information</Label>
              <p className="text-xs text-muted-foreground">
                Require purchase date and cost when adding assets
              </p>
            </div>
            <Switch
              checked={options.require_purchase_info}
              onCheckedChange={(checked) =>
                setOptions({ ...options, require_purchase_info: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable QR Codes</Label>
              <p className="text-xs text-muted-foreground">
                Generate QR codes for asset labels
              </p>
            </div>
            <Switch
              checked={options.enable_qr_codes}
              onCheckedChange={(checked) =>
                setOptions({ ...options, enable_qr_codes: checked })
              }
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label>Default Depreciation Method</Label>
            <Select
              value={options.default_depreciation_method}
              onValueChange={(value) =>
                setOptions({ ...options, default_depreciation_method: value })
              }
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="straight_line">Straight Line</SelectItem>
                <SelectItem value="declining_balance">Declining Balance</SelectItem>
                <SelectItem value="sum_of_years">Sum of Years' Digits</SelectItem>
                <SelectItem value="none">No Depreciation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
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
