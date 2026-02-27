import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, Plus, Loader2, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface AuditTabProps {
  assetId: string;
}

interface AuditRecord {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  details: any;
  created_at: string;
  performed_by: string | null;
}

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent", color: "bg-green-100 text-green-800" },
  { value: "good", label: "Good", color: "bg-blue-100 text-blue-800" },
  { value: "fair", label: "Fair", color: "bg-yellow-100 text-yellow-800" },
  { value: "poor", label: "Poor", color: "bg-red-100 text-red-800" },
];

export const AuditTab = ({ assetId }: AuditTabProps) => {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [condition, setCondition] = useState("good");
  const [locationVerified, setLocationVerified] = useState(true);
  const [notes, setNotes] = useState("");
  const [discrepancies, setDiscrepancies] = useState("");

  // Fetch audit records from asset history
  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["asset-audits", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_asset_history")
        .select("*")
        .eq("asset_id", assetId)
        .eq("action", "audit_recorded")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as AuditRecord[];
    },
    enabled: !!assetId,
  });

  // Fetch users for name lookup
  const { data: usersData = [] } = useQuery({
    queryKey: ["users-for-audit"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email");
      return data || [];
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unknown";
    const foundUser = usersData.find((u) => u.id === userId);
    return foundUser?.name || foundUser?.email || "Unknown";
  };

  // Create audit mutation
  const createAudit = useMutation({
    mutationFn: async () => {
      const auditDetails = {
        condition,
        location_verified: locationVerified,
        notes: notes || null,
        discrepancies: discrepancies || null,
        audited_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("itam_asset_history")
        .insert({
          asset_id: assetId,
          action: "audit_recorded",
          new_value: condition,
          details: auditDetails,
          performed_by: currentUser?.id || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-audits", assetId] });
      queryClient.invalidateQueries({ queryKey: ["asset-history", assetId] });
      toast.success("Audit recorded successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record audit");
    },
  });

  const resetForm = () => {
    setCondition("good");
    setLocationVerified(true);
    setNotes("");
    setDiscrepancies("");
  };

  const getConditionBadge = (conditionValue: string) => {
    const opt = CONDITION_OPTIONS.find((o) => o.value === conditionValue);
    return opt ? (
      <Badge className={opt.color}>{opt.label}</Badge>
    ) : (
      <Badge variant="outline">{conditionValue}</Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Audit
          </Button>

          {audits.length === 0 ? (
            <div className="text-center py-6">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No audit records</p>
              <p className="text-xs text-muted-foreground mt-1">
                Record physical audits to track asset condition
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {audits.map((audit) => {
                const details = audit.details as any || {};
                
                return (
                  <div
                    key={audit.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getConditionBadge(details.condition || audit.new_value || "unknown")}
                          {details.location_verified === false && (
                            <Badge variant="destructive" className="text-xs">
                              Location Not Verified
                            </Badge>
                          )}
                        </div>
                        
                        {details.notes && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {details.notes}
                          </p>
                        )}
                        
                        {details.discrepancies && (
                          <p className="text-sm text-destructive mt-1 line-clamp-2">
                            ⚠️ {details.discrepancies}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {audit.created_at 
                              ? format(new Date(audit.created_at), "dd MMM yyyy, HH:mm")
                              : "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {getUserName(audit.performed_by)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Record Audit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Physical Audit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Physical Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="locationVerified"
                  checked={locationVerified}
                  onCheckedChange={(checked) => setLocationVerified(checked === true)}
                />
                <Label htmlFor="locationVerified" className="text-sm font-normal cursor-pointer">
                  Asset found at recorded location
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Audit Notes</Label>
                <Textarea
                  placeholder="General observations about the asset..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Discrepancies Found</Label>
                <Textarea
                  placeholder="Any issues or discrepancies discovered..."
                  value={discrepancies}
                  onChange={(e) => setDiscrepancies(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createAudit.mutate()}
                disabled={createAudit.isPending}
              >
                {createAudit.isPending ? "Recording..." : "Record Audit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
