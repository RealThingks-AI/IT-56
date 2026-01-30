import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, UserCheck, Trash2, Wrench } from "lucide-react";

export default function BulkActionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets-bulk"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          make:itam_makes(id, name)
        `)
        .eq("is_active", true);
      return data || [];
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ status })
        .in("id", selectedAssets);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets-bulk"] });
      toast.success("Assets updated successfully");
      setSelectedAssets([]);
    },
    onError: (error) => {
      toast.error(`Failed to update assets: ${error.message}`);
    },
  });

  const toggleAsset = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const toggleAll = () => {
    if (selectedAssets.length === assets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(assets.map((a) => a.id));
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Bulk Actions</h1>
            <p className="text-sm text-muted-foreground">
              {selectedAssets.length} asset(s) selected
            </p>
          </div>
        </div>

        {selectedAssets.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                size="sm"
                onClick={() => bulkUpdateMutation.mutate({ status: "in_use" })}
                disabled={bulkUpdateMutation.isPending}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Bulk Check Out
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdateMutation.mutate({ status: "available" })}
                disabled={bulkUpdateMutation.isPending}
              >
                <Package className="h-4 w-4 mr-2" />
                Bulk Check In
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdateMutation.mutate({ status: "disposed" })}
                disabled={bulkUpdateMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Bulk Dispose
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkUpdateMutation.mutate({ status: "maintenance" })}
                disabled={bulkUpdateMutation.isPending}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Bulk Maintenance
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={selectedAssets.length === assets.length && assets.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>ASSET ID</TableHead>
                <TableHead>MAKE</TableHead>
                <TableHead>MODEL</TableHead>
                <TableHead>CATEGORY</TableHead>
                <TableHead>STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading assets...
                  </TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No assets found.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAssets.includes(asset.id)}
                        onCheckedChange={() => toggleAsset(asset.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{asset.asset_id || "—"}</TableCell>
                    <TableCell>{asset.make?.name || "—"}</TableCell>
                    <TableCell>{asset.model || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{asset.category?.name || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.status === "available" ? "default" : "secondary"}>
                        {asset.status || "available"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
