import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wrench, Calendar, DollarSign, Building2, MoreHorizontal, Clock, FileText, Loader2, History, XCircle } from "lucide-react";
import { useState } from "react";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  open: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Open" },
  in_progress: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", label: "In Progress" },
  completed: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Completed" },
  cancelled: { color: "bg-muted text-muted-foreground", label: "Cancelled" },
};

const RepairDetail = () => {
  const { repairId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [resolution, setResolution] = useState("");

  const { data: repair, isLoading } = useQuery({
    queryKey: ["itam-repair-detail", repairId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_repairs")
        .select("*, itam_assets(id, name, asset_tag, asset_id, status), itam_vendors(id, name)")
        .eq("id", repairId || "")
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!repairId,
  });

  // Fetch repair history
  const { data: history = [] } = useQuery({
    queryKey: ["itam-repair-history", repair?.asset_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_asset_history")
        .select("*")
        .eq("asset_id", repair!.asset_id)
        .in("action", ["sent_for_repair", "repair_created", "repair_completed", "repair_cancelled", "status_change"])
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!repair?.asset_id,
  });

  const updateRepair = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const currentUser = (await supabase.auth.getUser()).data.user;
      
      const { error } = await supabase
        .from("itam_repairs")
        .update(updates)
        .eq("id", repairId || "");
      
      if (error) throw error;

      // Restore asset status when completed or cancelled
      if (updates.status === "completed" || updates.status === "cancelled") {
        await supabase
          .from("itam_assets")
          .update({ status: ASSET_STATUS.AVAILABLE, updated_by: currentUser?.id })
          .eq("id", repair?.asset_id);

        await supabase.from("itam_asset_history").insert({
          asset_id: repair?.asset_id,
          action: updates.status === "completed" ? "repair_completed" : "repair_cancelled",
          details: { repair_id: repairId, cost: updates.cost || null },
          performed_by: currentUser?.id,
        });
      }
    },
    onSuccess: () => {
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["itam-repair-detail", repairId] });
      queryClient.invalidateQueries({ queryKey: ["itam-repair-history"] });
      toast.success("Repair updated successfully");
      setStatus("");
      setActualCost("");
      setDiagnosis("");
      setResolution("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update repair");
    },
  });

  const handleStatusUpdate = () => {
    if (!status) {
      toast.error("Please select a status");
      return;
    }
    const updates: Record<string, any> = { status };
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
      if (actualCost) updates.cost = parseFloat(actualCost);
      if (resolution) updates.resolution = resolution;
    }
    if (diagnosis) updates.diagnosis = diagnosis;
    updateRepair.mutate(updates);
  };

  const handleQuickCancel = () => {
    updateRepair.mutate({ 
      status: "cancelled", 
      completed_at: new Date().toISOString() 
    });
  };

  const statusConfig = STATUS_CONFIG[repair?.status || "open"] || STATUS_CONFIG.open;
  const isEditable = repair?.status !== "completed" && repair?.status !== "cancelled";

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="h-full overflow-auto flex items-center justify-center">
        <div className="text-center space-y-2">
          <Wrench className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Repair not found</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/assets/advanced?tab=repairs")}>
            Back to Repairs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-4 animate-in fade-in-0 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Repair Details</h1>
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {repair.repair_number || `RPR-${repair.id.slice(0, 8)}`}
              </p>
            </div>
          </div>
          {isEditable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleQuickCancel} className="text-destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Repair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="animate-in fade-in-0 slide-in-from-left-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Repair Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={<Wrench className="h-4 w-4" />} label="Asset" value={
                <span className="font-medium">
                  {repair.itam_assets?.name || "Unknown"} 
                  <span className="text-muted-foreground ml-1">({repair.itam_assets?.asset_tag || repair.itam_assets?.asset_id || "—"})</span>
                </span>
              } />
              <div>
                <Label className="text-xs text-muted-foreground">Issue Description</Label>
                <p className="text-sm mt-0.5">{repair.issue_description || "—"}</p>
              </div>
              {repair.diagnosis && (
                <div>
                  <Label className="text-xs text-muted-foreground">Diagnosis</Label>
                  <p className="text-sm mt-0.5">{repair.diagnosis}</p>
                </div>
              )}
              {repair.resolution && (
                <div>
                  <Label className="text-xs text-muted-foreground">Resolution</Label>
                  <p className="text-sm mt-0.5">{repair.resolution}</p>
                </div>
              )}
              {repair.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-0.5">{repair.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="animate-in fade-in-0 slide-in-from-right-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cost & Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {repair.itam_vendors && (
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Vendor" value={repair.itam_vendors.name} />
              )}
              <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Cost" value={
                repair.cost ? `₹ ${Number(repair.cost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"
              } />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Created" value={
                repair.created_at ? format(new Date(repair.created_at), "MMM dd, yyyy") : "—"
              } />
              {repair.started_at && (
                <InfoRow icon={<Clock className="h-4 w-4" />} label="Started" value={
                  format(new Date(repair.started_at), "MMM dd, yyyy")
                } />
              )}
              {repair.completed_at && (
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Completed" value={
                  format(new Date(repair.completed_at), "MMM dd, yyyy")
                } />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Update Status Card */}
        {isEditable && (
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Update Repair</CardTitle>
              <CardDescription className="text-xs">Update status, diagnosis, and costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Actual Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    disabled={status !== "completed"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Diagnosis</Label>
                <Textarea
                  placeholder="Technical diagnosis..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                />
              </div>
              {status === "completed" && (
                <div className="space-y-2">
                  <Label className="text-sm">Resolution</Label>
                  <Textarea
                    placeholder="What was done to resolve..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
              <Button 
                onClick={handleStatusUpdate} 
                disabled={!status || updateRepair.isPending}
                className="w-full sm:w-auto"
              >
                {updateRepair.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Repair
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History Timeline */}
        {history.length > 0 && (
          <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Repair History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((entry: any) => (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium capitalize">{(entry.action || "").replace(/_/g, " ")}</p>
                      {entry.details && typeof entry.details === "object" && (
                        <p className="text-xs text-muted-foreground truncate">
                          {Object.entries(entry.details as Record<string, any>)
                            .filter(([, v]) => v)
                            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                            .join(" • ")}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {entry.created_at ? format(new Date(entry.created_at), "MMM dd, yyyy 'at' HH:mm") : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  </div>
);

export default RepairDetail;
