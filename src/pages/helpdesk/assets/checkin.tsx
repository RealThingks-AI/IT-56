import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Package, X } from "lucide-react";

const CheckinPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Fetch assigned assets (active assignments)
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["itam-active-assignments", search],
    queryFn: async () => {
      let query = supabase
        .from("itam_asset_assignments")
        .select("*, asset:itam_assets(id, name, asset_tag, asset_id, category:itam_categories(name))")
        .is("returned_at", null)
        .order("assigned_at", { ascending: false });

      const { data } = await query;
      
      // Filter client-side if search is provided
      let filtered = data || [];
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(a => 
          a.asset?.name?.toLowerCase().includes(searchLower) ||
          a.asset?.asset_tag?.toLowerCase().includes(searchLower) ||
          a.asset?.asset_id?.toLowerCase().includes(searchLower) ||
          a.assigned_to?.toLowerCase().includes(searchLower)
        );
      }
      
      return filtered;
    },
  });

  // Checkin mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (selectedAssignments.length === 0) throw new Error("Please select at least one asset");

      const now = new Date().toISOString();

      // Update assignments with return date
      const { error: assignError } = await supabase
        .from("itam_asset_assignments")
        .update({ 
          returned_at: now,
          notes: notes || null
        })
        .in("id", selectedAssignments);

      if (assignError) throw assignError;

      // Get asset IDs from selected assignments
      const assetIds = assignments
        .filter(a => selectedAssignments.includes(a.id))
        .map(a => a.asset_id);

      // Update asset statuses to available
      const { error: updateError } = await supabase
        .from("itam_assets")
        .update({ status: "available" })
        .in("id", assetIds);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success(`${selectedAssignments.length} asset(s) checked in successfully`);
      queryClient.invalidateQueries({ queryKey: ["itam-assets"] });
      queryClient.invalidateQueries({ queryKey: ["itam-active-assignments"] });
      navigate("/assets/allassets");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to check in assets");
    },
  });

  const toggleAssignment = (assignmentId: string) => {
    setSelectedAssignments(prev => 
      prev.includes(assignmentId) 
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const handleCheckin = () => {
    checkinMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-xl font-semibold">Check In Assets</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Asset Selection */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select Assets to Check In</CardTitle>
              <CardDescription>Choose one or more currently assigned assets to return</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by asset name, tag, or assigned to..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Selected Assets Summary */}
              {selectedAssignments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-accent rounded-lg">
                  <span className="text-sm font-medium">Selected ({selectedAssignments.length}):</span>
                  {selectedAssignments.map(id => {
                    const assignment = assignments.find(a => a.id === id);
                    return assignment ? (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {assignment.asset?.asset_tag || assignment.asset?.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => toggleAssignment(id)}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* Assets Table */}
              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Tag/ID</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Assigned Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow 
                        key={assignment.id} 
                        className="cursor-pointer"
                        onClick={() => toggleAssignment(assignment.id)}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedAssignments.includes(assignment.id)}
                            onCheckedChange={() => toggleAssignment(assignment.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{assignment.asset?.name}</TableCell>
                        <TableCell>{assignment.asset?.asset_tag || assignment.asset?.asset_id}</TableCell>
                        <TableCell>
                          {assignment.assigned_to || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {assignment.assigned_at ? format(new Date(assignment.assigned_at), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {assignments.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No assigned assets found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Checkin Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Check In Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-accent/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {selectedAssignments.length === 0 
                    ? "Select assets from the list to check them back in"
                    : `${selectedAssignments.length} asset(s) selected for check-in`
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label>Return Notes</Label>
                <Textarea
                  placeholder="Add any notes about the condition or return..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="pt-4 space-y-2">
                <Button 
                  className="w-full" 
                  onClick={handleCheckin}
                  disabled={selectedAssignments.length === 0 || checkinMutation.isPending}
                >
                  {checkinMutation.isPending ? "Processing..." : `Check In ${selectedAssignments.length} Asset(s)`}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/assets/allassets")}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckinPage;
