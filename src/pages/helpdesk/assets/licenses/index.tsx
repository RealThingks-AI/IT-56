import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Key } from "lucide-react";
import { format } from "date-fns";

const LicensesList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["itam-licenses-list", searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_licenses")
        .select("*, itam_vendors(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const filteredLicenses = licenses.filter((license) =>
    searchTerm
      ? license.name.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold">License Management</h1>
              <p className="text-sm text-muted-foreground">
                {filteredLicenses.length} licenses
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate("/assets/licenses/add-license")}>
            <Plus className="h-4 w-4 mr-2" />
            Add License
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search licenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Licenses Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium">LICENSE NAME</TableHead>
                <TableHead className="text-xs font-medium">VENDOR</TableHead>
                <TableHead className="text-xs font-medium">TYPE</TableHead>
                <TableHead className="text-xs font-medium">SEATS</TableHead>
                <TableHead className="text-xs font-medium">UTILIZATION</TableHead>
                <TableHead className="text-xs font-medium">EXPIRY</TableHead>
                <TableHead className="text-xs font-medium">COST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Loading licenses...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLicenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Key className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No licenses found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLicenses.map((license) => {
                  const seatsTotal = license.seats_total || 1;
                  const seatsAllocated = license.seats_allocated || 0;
                  const utilization = (seatsAllocated / seatsTotal) * 100;
                  return (
                    <TableRow
                      key={license.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/assets/licenses/${license.id}`)}
                    >
                      <TableCell className="font-medium">{license.name}</TableCell>
                      <TableCell className="text-sm">
                        {license.itam_vendors?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {license.license_type || "License"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {seatsAllocated} / {seatsTotal}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`text-xs font-medium ${getUtilizationColor(utilization)}`}>
                            {utilization.toFixed(0)}%
                          </div>
                          <Progress value={utilization} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {license.expiry_date
                          ? format(new Date(license.expiry_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {license.cost ? `₹${license.cost.toLocaleString()}` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default LicensesList;
