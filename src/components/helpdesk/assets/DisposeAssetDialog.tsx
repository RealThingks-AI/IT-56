import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ASSET_STATUS, getStatusLabel } from "@/lib/assets/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assets/assetQueryUtils";
import { useCurrency } from "@/hooks/useCurrency";

interface DisposeAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  onSuccess?: () => void;
}

const DISPOSAL_METHODS = [
  { value: "sold", label: "Sold" },
  { value: "donated", label: "Donated" },
  { value: "recycled", label: "Recycled" },
  { value: "scrapped", label: "Scrapped" },
  { value: "returned", label: "Returned to Vendor" },
  { value: "other", label: "Other" },
];

export function DisposeAssetDialog({ open, onOpenChange, assetId, assetName, onSuccess }: DisposeAssetDialogProps) {
  const queryClient = useQueryClient();
  const { symbol: defaultSymbol } = useCurrency();
  const [disposalMethod, setDisposalMethod] = useState("");
  const [disposalDate, setDisposalDate] = useState<Date>(new Date());
  const [disposalValue, setDisposalValue] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch asset data (including currency) when dialog opens
  const SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AUD: "A$", CAD: "C$", CHF: "CHF", CNY: "¥", SGD: "S$", AED: "د.إ" };
  const { data: assetData } = useQuery({
    queryKey: ["dispose-asset-data", assetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("status, purchase_price, custom_fields")
        .eq("id", assetId)
        .single();
      return data;
    },
    enabled: open && !!assetId,
    staleTime: 60_000,
  });

  const assetCurrency = (assetData?.custom_fields as Record<string, any>)?.currency;
  const currencySymbol = assetCurrency ? (SYMBOLS[assetCurrency] || assetCurrency) : defaultSymbol;

  const disposeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Merge disposal data into existing custom_fields
      const existingCustomFields = (assetData?.custom_fields as Record<string, any>) || {};
      const mergedCustomFields = {
        ...existingCustomFields,
        disposal_method: disposalMethod,
        disposal_date: disposalDate.toISOString(),
        disposal_value: disposalValue ? parseFloat(disposalValue) : null,
        disposal_notes: notes || null,
      };

      // Update asset status to disposed with merged custom_fields
      const { error: assetError } = await supabase
        .from("itam_assets")
        .update({ 
          status: ASSET_STATUS.DISPOSED,
          is_active: false,
          custom_fields: mergedCustomFields,
          assigned_to: null,
          checked_out_to: null,
          checked_out_at: null,
          expected_return_date: null,
          check_out_notes: null,
        })
        .eq("id", assetId);
      
      if (assetError) throw assetError;

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "disposed",
        old_value: getStatusLabel(assetData?.status),
        new_value: getStatusLabel(ASSET_STATUS.DISPOSED),
        details: { 
          disposal_method: disposalMethod,
          disposal_date: disposalDate.toISOString(),
          disposal_value: disposalValue ? parseFloat(disposalValue) : null,
          notes,
        },
        performed_by: currentUser?.id,
      });
    },
    onSuccess: () => {
      toast.success("Asset disposed successfully");
      invalidateAllAssetQueries(queryClient);
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setDisposalMethod("");
      setDisposalDate(new Date());
      setDisposalValue("");
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to dispose asset");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    if (!disposalMethod) {
      toast.error("Please select a disposal method");
      return;
    }
    disposeMutation.mutate();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDisposalMethod("");
      setDisposalDate(new Date());
      setDisposalValue("");
      setNotes("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dispose Asset</DialogTitle>
          <DialogDescription>
            Dispose of asset "{assetName}". This action will mark the asset as disposed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Disposal Method <span className="text-destructive">*</span></Label>
            <Select value={disposalMethod} onValueChange={setDisposalMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method..." />
              </SelectTrigger>
              <SelectContent>
                {DISPOSAL_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Disposal Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(disposalDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={disposalDate}
                  onSelect={(date) => date && setDisposalDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {(disposalMethod === "sold" || disposalMethod === "returned") && (
            <div className="space-y-2">
              <Label htmlFor="disposalValue">
                {disposalMethod === "sold" ? "Sale Value" : "Return Value"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                <Input
                  id="disposalValue"
                  type="number"
                  value={disposalValue}
                  onChange={(e) => setDisposalValue(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about the disposal..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
          <Button 
            variant="destructive"
            onClick={handleSubmit} 
            disabled={!disposalMethod || disposeMutation.isPending}
          >
            {disposeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dispose
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
