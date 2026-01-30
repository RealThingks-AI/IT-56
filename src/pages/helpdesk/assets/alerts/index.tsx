import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AssetTopBar } from "@/components/helpdesk/assets/AssetTopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Wrench, 
  FileText, 
  Calendar,
  ExternalLink,
  Bell,
  BellOff
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

const AlertsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = searchParams.get("type") || "warranty";

  // Fetch expiring warranties (next 30 days)
  const { data: expiringWarranties = [] } = useQuery({
    queryKey: ["itam-expiring-warranties-full"],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data } = await supabase
        .from("itam_assets")
        .select("*")
        .eq("is_active", true)
        .not("warranty_expiry", "is", null)
        .lte("warranty_expiry", thirtyDaysFromNow.toISOString())
        .order("warranty_expiry", { ascending: true });
      return data || [];
    },
  });

  // Fetch maintenance due
  const { data: maintenanceDue = [] } = useQuery({
    queryKey: ["itam-maintenance-due-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_repairs")
        .select("*, asset:itam_assets(id, name, asset_tag, asset_id)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  // Fetch overdue check-ins (using notes field as a workaround)
  const { data: overdueCheckins = [] } = useQuery({
    queryKey: ["itam-overdue-checkins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_asset_assignments")
        .select("*, asset:itam_assets(id, name, asset_tag, asset_id)")
        .is("returned_at", null)
        .order("expected_return_date", { ascending: true });
      return data || [];
    },
  });

  // Fetch expiring licenses
  const { data: expiringLicenses = [] } = useQuery({
    queryKey: ["itam-expiring-licenses"],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data } = await supabase
        .from("itam_licenses")
        .select("*")
        .eq("is_active", true)
        .not("expiry_date", "is", null)
        .lte("expiry_date", thirtyDaysFromNow.toISOString())
        .order("expiry_date", { ascending: true });
      return data || [];
    },
  });

  const getDaysUntil = (date: string) => {
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { text: `${Math.abs(days)} days overdue`, variant: "destructive" as const };
    if (days === 0) return { text: "Today", variant: "destructive" as const };
    if (days <= 7) return { text: `${days} days`, variant: "destructive" as const };
    if (days <= 14) return { text: `${days} days`, variant: "outline" as const };
    return { text: `${days} days`, variant: "secondary" as const };
  };

  const alertCounts = {
    warranty: expiringWarranties.length,
    maintenance: maintenanceDue.length,
    overdue: overdueCheckins.length,
    licenses: expiringLicenses.length
  };

  const totalAlerts = Object.values(alertCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background">
      <AssetTopBar />
      
      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={`cursor-pointer transition-all ${initialTab === "warranty" ? "ring-2 ring-primary" : ""}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertCounts.warranty}</p>
                <p className="text-xs text-muted-foreground">Warranty Expiring</p>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${initialTab === "maintenance" ? "ring-2 ring-primary" : ""}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <Wrench className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertCounts.maintenance}</p>
                <p className="text-xs text-muted-foreground">Maintenance Due</p>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${initialTab === "overdue" ? "ring-2 ring-primary" : ""}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertCounts.overdue}</p>
                <p className="text-xs text-muted-foreground">Assets Overdue</p>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${initialTab === "licenses" ? "ring-2 ring-primary" : ""}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertCounts.licenses}</p>
                <p className="text-xs text-muted-foreground">Licenses Expiring</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Details */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alerts ({totalAlerts})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue={initialTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4 rounded-none border-b bg-transparent">
                <TabsTrigger value="warranty" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  Warranty ({alertCounts.warranty})
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  Maintenance ({alertCounts.maintenance})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  Overdue ({alertCounts.overdue})
                </TabsTrigger>
                <TabsTrigger value="licenses" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  Licenses ({alertCounts.licenses})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="warranty" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Warranty Expiry</TableHead>
                      <TableHead>Days Until</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringWarranties.map((asset) => {
                      const daysInfo = getDaysUntil(asset.warranty_expiry);
                      return (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>{asset.asset_tag || asset.asset_id}</TableCell>
                          <TableCell>{format(new Date(asset.warranty_expiry), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={daysInfo.variant}>{daysInfo.text}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/assets/detail/${asset.id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {expiringWarranties.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No warranties expiring in the next 30 days
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="maintenance" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceDue.map((repair) => (
                      <TableRow key={repair.id}>
                        <TableCell className="font-medium">{repair.asset?.name || 'N/A'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{repair.issue_description}</TableCell>
                        <TableCell>
                          {repair.created_at ? format(new Date(repair.created_at), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{repair.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/assets/repairs/detail/${repair.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {maintenanceDue.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No pending maintenance
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="overdue" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueCheckins.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.asset?.name || 'N/A'}</TableCell>
                          <TableCell>{assignment.assigned_to || 'Unknown'}</TableCell>
                          <TableCell>{format(new Date(assignment.assigned_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Assigned</Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/assets/detail/${assignment.asset_id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                    ))}
                    {overdueCheckins.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No overdue assets
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="licenses" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Until</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringLicenses.map((license) => {
                      const daysInfo = getDaysUntil(license.expiry_date);
                      return (
                        <TableRow key={license.id}>
                          <TableCell className="font-medium">{license.name}</TableCell>
                          <TableCell>{license.license_type || 'N/A'}</TableCell>
                          <TableCell>{format(new Date(license.expiry_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={daysInfo.variant}>{daysInfo.text}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate("/assets/licenses")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {expiringLicenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No licenses expiring in the next 30 days
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AlertsPage;
