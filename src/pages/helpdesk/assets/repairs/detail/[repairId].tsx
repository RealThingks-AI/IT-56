import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wrench, Calendar, DollarSign, Building2 } from "lucide-react";
import { useState } from "react";

const RepairDetail = () => {
  const { repairId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [actualCost, setActualCost] = useState("");

  const { data: repair, isLoading } = useQuery({
    queryKey: ["itam-repair-detail", repairId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_repairs")
        .select("*, itam_assets(*), itam_vendors(*)")
        .eq("id", repairId || "")
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!repairId,
  });

  const updateRepair = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("itam_repairs")
        .update(updates)
        .eq("id", repairId || "");
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itam-repair-detail", repairId] });
      toast.success("Repair updated successfully");
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

    const updates: any = { status };
    
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
      if (actualCost) {
        updates.cost = parseFloat(actualCost);
      }
    }

    updateRepair.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p>Loading repair details...</p>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p>Repair not found</p>
      </div>
    );
  }

  const getStatusBadge = (s: string) => {
    const variants: Record<string, string> = {
      open: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return variants[s] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Repair Details</h1>
                <Badge className={getStatusBadge(repair.status || "open")}>
                  {(repair.status || "open").replace("_", " ")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Repair: {repair.repair_number || `R-${repair.id.slice(0, 8)}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Repair Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Asset</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {repair.itam_assets?.name || "Unknown"} ({repair.itam_assets?.asset_tag || "—"})
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Issue Description</Label>
                <p className="mt-1">{repair.issue_description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created At
                  </Label>
                  <p className="mt-1 font-medium">
                    {repair.created_at ? format(new Date(repair.created_at), "MMM dd, yyyy") : "—"}
                  </p>
                </div>
                {repair.completed_at && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Completed At
                    </Label>
                    <p className="mt-1 font-medium">
                      {format(new Date(repair.completed_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost & Vendor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {repair.itam_vendors && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Vendor
                  </Label>
                  <p className="mt-1 font-medium">{repair.itam_vendors.name}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Cost
                </Label>
                <p className="mt-1 font-medium">
                  {repair.cost ? `INR ${repair.cost}` : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {repair.status !== "completed" && repair.status !== "cancelled" && (
          <Card>
            <CardHeader>
              <CardTitle>Update Repair Status</CardTitle>
              <CardDescription>Update the status and costs for this repair</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
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
                  <Label>Actual Cost (if completed)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    disabled={status !== "completed"}
                  />
                </div>
              </div>

              <Button 
                onClick={handleStatusUpdate} 
                disabled={!status || updateRepair.isPending}
              >
                {updateRepair.isPending ? "Updating..." : "Update Repair"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RepairDetail;
