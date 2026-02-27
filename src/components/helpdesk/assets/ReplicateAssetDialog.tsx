import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

interface ReplicateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function ReplicateAssetDialog({ open, onOpenChange, assetId, assetName, onSuccess }: ReplicateAssetDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replicationType, setReplicationType] = useState<"single" | "multiple">("single");
  const [copyCount, setCopyCount] = useState(2);

  const replicateMutation = useMutation({
    mutationFn: async () => {
      // Fetch current asset data
      const { data: assetData, error: fetchError } = await supabase
        .from("itam_assets")
        .select("*")
        .eq("id", assetId)
        .single();
      if (fetchError) throw fetchError;

      // Remove fields that should be unique
      const { id, created_at, updated_at, asset_id: originalAssetId, asset_tag, ...assetToCopy } = assetData;

      const count = replicationType === "single" ? 1 : Math.min(Math.max(copyCount, 1), 10);
      const createdAssets = [];

      for (let i = 0; i < count; i++) {
        const timestamp = Date.now() + i;
        const { data, error } = await supabase
          .from("itam_assets")
          .insert({
            ...assetToCopy,
            name: count > 1 
              ? `${assetToCopy.name || 'Asset'} (Copy ${i + 1})`
              : `${assetToCopy.name || 'Asset'} (Copy)`,
            asset_id: `${originalAssetId}-COPY-${timestamp}`,
            asset_tag: asset_tag ? `${asset_tag}-COPY-${i + 1}` : null,
            status: ASSET_STATUS.AVAILABLE,
            assigned_to: null,
            checked_out_at: null,
            checked_out_to: null,
            expected_return_date: null,
            check_out_notes: null,
          })
          .select()
          .single();
        
        if (error) throw error;
        createdAssets.push(data);
      }

      return createdAssets;
    },
    onSuccess: (data) => {
      const count = data.length;
      toast.success(`${count} asset${count > 1 ? 's' : ''} created successfully`);
      invalidateAllAssetQueries(queryClient);
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setReplicationType("single");
      setCopyCount(2);
      // Navigate to first created asset
      if (data.length > 0) {
        navigate(`/assets/detail/${data[0].asset_tag || data[0].id}`);
      }
    },
    onError: (error) => {
      toast.error("Failed to replicate asset");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    replicateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Replicate Asset</DialogTitle>
          <DialogDescription>
            Do you want to create a copy of the asset {assetName}?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            <RadioGroup 
              value={replicationType} 
              onValueChange={(value) => setReplicationType(value as "single" | "multiple")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium min-w-[70px]">Replicate</span>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="font-normal cursor-pointer">
                    Single time
                  </Label>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="min-w-[70px]"></span>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="multiple" />
                  <Label htmlFor="multiple" className="font-normal cursor-pointer">
                    Multiple times
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {replicationType === "multiple" && (
            <div className="flex items-center gap-3 pl-[82px]">
              <Label htmlFor="copyCount" className="text-sm">Number:</Label>
              <Input
                id="copyCount"
                type="number"
                min={2}
                max={10}
                value={copyCount}
                onChange={(e) => setCopyCount(Math.min(10, Math.max(2, parseInt(e.target.value) || 2)))}
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">(max 10)</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
          <Button 
            onClick={handleSubmit} 
            disabled={replicateMutation.isPending}
          >
            {replicateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Replicate
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
