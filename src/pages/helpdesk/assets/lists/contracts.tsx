import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AssetTopBar } from "@/components/helpdesk/assets/AssetTopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";

const ContractsListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // For now, we'll show license contracts as a proxy for contracts
  // In a full implementation, you'd have a dedicated itam_contracts table
  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["itam-licenses-contracts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_licenses")
        .select("*, vendor:itam_vendors(name)")
        .eq("is_active", true)
        .order("expiry_date", { ascending: true });
      return data || [];
    },
  });

  // Filter
  const filteredLicenses = licenses.filter(license => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      license.name?.toLowerCase().includes(searchLower) ||
      license.license_key?.toLowerCase().includes(searchLower) ||
      license.vendor?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate contract status
  const getContractStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: "no-expiry", label: "No Expiry", variant: "secondary" as const };
    
    const expiry = new Date(expiryDate);
    const daysUntil = differenceInDays(expiry, new Date());
    
    if (isPast(expiry)) {
      return { status: "expired", label: "Expired", variant: "destructive" as const };
    } else if (daysUntil <= 30) {
      return { status: "expiring", label: "Expiring Soon", variant: "outline" as const };
    } else {
      return { status: "active", label: "Active", variant: "secondary" as const };
    }
  };

  // Stats
  const activeCount = licenses.filter(l => !l.expiry_date || !isPast(new Date(l.expiry_date))).length;
  const expiringCount = licenses.filter(l => {
    if (!l.expiry_date) return false;
    const days = differenceInDays(new Date(l.expiry_date), new Date());
    return days > 0 && days <= 30;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <AssetTopBar />
      
      <div className="p-4 space-y-4">
        {/* Info Banner */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">Software Licenses & Contracts</p>
              <p className="text-xs text-blue-600">
                This view shows software licenses. For asset-specific contracts, view the Contracts tab on individual asset details.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Contracts</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringCount}</p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">License Contracts</CardTitle>
              <Button size="sm" onClick={() => navigate("/assets/licenses")}>
                <Plus className="h-4 w-4 mr-1" />
                Add License
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((license) => {
                    const statusInfo = getContractStatus(license.expiry_date);
                    return (
                      <TableRow key={license.id} className="cursor-pointer" onClick={() => navigate("/assets/licenses")}>
                        <TableCell className="font-medium">{license.name}</TableCell>
                        <TableCell>{license.vendor?.name || '-'}</TableCell>
                        <TableCell>{license.license_type || '-'}</TableCell>
                        <TableCell>
                          {license.seats_allocated}/{license.seats_total}
                        </TableCell>
                        <TableCell>
                          {license.expiry_date 
                            ? format(new Date(license.expiry_date), 'MMM dd, yyyy')
                            : 'No expiry'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredLicenses.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No contracts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractsListPage;
