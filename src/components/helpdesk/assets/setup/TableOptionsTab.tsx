import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const DEFAULT_COLUMNS = [
  { key: "asset_id", label: "Asset ID", default: true },
  { key: "name", label: "Name", default: true },
  { key: "category", label: "Category", default: true },
  { key: "status", label: "Status", default: true },
  { key: "location", label: "Location", default: true },
  { key: "department", label: "Department", default: false },
  { key: "assigned_to", label: "Assigned To", default: false },
  { key: "purchase_date", label: "Purchase Date", default: false },
  { key: "purchase_cost", label: "Purchase Cost", default: false },
  { key: "warranty_end", label: "Warranty End", default: false },
  { key: "serial_number", label: "Serial Number", default: false },
  { key: "make", label: "Make", default: false },
  { key: "model", label: "Model", default: false },
];

export function TableOptionsTab() {
  const queryClient = useQueryClient();
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_COLUMNS.filter(c => c.default).map(c => c.key)
  );

  // Simplified query - no org_id filtering, fetch the single settings record
  const { data: settings, isLoading } = useQuery({
    queryKey: ["itam-settings", "asset_table_columns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_settings")
        .select("value")
        .eq("key", "asset_table_columns")
        .maybeSingle();

      return data?.value as { visible_columns?: string[] } | null;
    },
  });

  useEffect(() => {
    if (settings?.visible_columns) {
      setVisibleColumns(settings.visible_columns);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("itam_settings")
        .select("id")
        .eq("key", "asset_table_columns")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("itam_settings")
          .update({ value: { visible_columns: visibleColumns } })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert without org_id - use tenant_id if needed
        const { error } = await supabase
          .from("itam_settings")
          .insert({
            key: "asset_table_columns",
            value: { visible_columns: visibleColumns },
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Table options saved successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-settings", "asset_table_columns"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const handleColumnToggle = (key: string, checked: boolean) => {
    if (checked) {
      setVisibleColumns([...visibleColumns, key]);
    } else {
      setVisibleColumns(visibleColumns.filter(c => c !== key));
    }
  };

  const resetToDefaults = () => {
    setVisibleColumns(DEFAULT_COLUMNS.filter(c => c.default).map(c => c.key));
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
          <Table className="h-4 w-4" />
          Table Options
        </CardTitle>
        <CardDescription className="text-xs">
          Configure which columns are visible in the asset list
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {DEFAULT_COLUMNS.map((column) => (
            <div key={column.key} className="flex items-center space-x-2">
              <Checkbox
                id={column.key}
                checked={visibleColumns.includes(column.key)}
                onCheckedChange={(checked) => handleColumnToggle(column.key, checked as boolean)}
              />
              <Label htmlFor={column.key} className="text-sm cursor-pointer">
                {column.label}
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
