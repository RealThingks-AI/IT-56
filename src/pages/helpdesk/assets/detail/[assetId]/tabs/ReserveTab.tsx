import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, User, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ReserveTabProps {
  assetId: string;
}

interface Reservation {
  id: string;
  start_date: string;
  end_date: string;
  purpose: string | null;
  status: string | null;
  reserved_for_name: string | null;
  reserved_by: string | null;
  notes: string | null;
  created_at: string | null;
}

export const ReserveTab = ({ assetId }: ReserveTabProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reserved_for_name: "",
    purpose: "",
    notes: "",
  });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["asset-reservations", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_asset_reservations")
        .select("*")
        .eq("asset_id", assetId)
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!assetId,
  });

  const createReservation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("itam_asset_reservations")
        .insert({
          asset_id: assetId,
          start_date: data.start_date,
          end_date: data.end_date,
          reserved_for_name: data.reserved_for_name || null,
          purpose: data.purpose || null,
          notes: data.notes || null,
          reserved_by: user.id,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-reservations", assetId] });
      toast.success("Reservation created successfully");
      setDialogOpen(false);
      setFormData({ start_date: "", end_date: "", reserved_for_name: "", purpose: "", notes: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create reservation");
    },
  });

  const cancelReservation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("itam_asset_reservations")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-reservations", assetId] });
      toast.success("Reservation cancelled");
    },
  });

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return (
      <Badge variant={variants[status || ""] || "secondary"}>
        {status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Pending"}
      </Badge>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.start_date || !formData.end_date) {
      toast.error("Please select start and end dates");
      return;
    }
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast.error("End date must be after start date");
      return;
    }
    createReservation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Reservation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reserved_for">Reserved For</Label>
                  <Input
                    id="reserved_for"
                    placeholder="Person or department name"
                    value={formData.reserved_for_name}
                    onChange={(e) => setFormData({ ...formData, reserved_for_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input
                    id="purpose"
                    placeholder="e.g., Project meeting, Training"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createReservation.isPending}>
                    {createReservation.isPending ? "Creating..." : "Create Reservation"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {reservations.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No reservations</p>
              <p className="text-xs text-muted-foreground mt-1">Book this asset for future use</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reservations.map((res) => (
                <div
                  key={res.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(res.status)}
                      <span className="text-sm">
                        {format(new Date(res.start_date), "dd MMM")} - {format(new Date(res.end_date), "dd MMM yyyy")}
                      </span>
                    </div>
                    {res.reserved_for_name && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        {res.reserved_for_name}
                      </div>
                    )}
                    {res.purpose && (
                      <p className="text-sm text-muted-foreground mt-0.5">{res.purpose}</p>
                    )}
                  </div>
                  {res.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => cancelReservation.mutate(res.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};