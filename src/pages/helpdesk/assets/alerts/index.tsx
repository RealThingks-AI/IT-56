import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/helpdesk/assets/StatCard";
import { 
  AlertTriangle, 
  Wrench, 
  FileText, 
  Calendar,
  ExternalLink,
  Bell,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useUsersLookup } from "@/hooks/useUsersLookup";

const AlertsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "warranty");

  // Fetch expiring warranties (next 30 days)
  const { data: expiringWarranties = [] } = useQuery({
    queryKey: ["itam-expiring-warranties-full"],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data } = await supabase
        .from("itam_assets")
        .select("id, asset_id, asset_tag, name, status, warranty_expiry, purchase_date, model, serial_number, assigned_to, category:itam_categories(name)")
        .eq("is_active", true)
        .not("warranty_expiry", "is", null)
        .lte("warranty_expiry", thirtyDaysFromNow.toISOString())
        .gte("warranty_expiry", new Date().toISOString())
        .order("warranty_expiry", { ascending: true });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch overdue check-ins - properly filtered by expected_return_date
  const { data: overdueCheckins = [] } = useQuery({
    queryKey: ["itam-overdue-checkins-alerts"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from("itam_asset_assignments")
        .select("*, asset:itam_assets(id, name, asset_tag, asset_id)")
        .is("returned_at", null)
        .not("expected_return_date", "is", null)
        .lt("expected_return_date", today)
        .order("expected_return_date", { ascending: true });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { resolveUserName } = useUsersLookup();

  const getUserName = (userId: string) => {
    return resolveUserName(userId) || "Unknown";
  };

  // Fetch expiring licenses - with .gte to exclude already-expired
  const { data: expiringLicenses = [] } = useQuery({
    queryKey: ["itam-expiring-licenses-alerts"],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data } = await supabase
        .from("itam_licenses")
        .select("*")
        .eq("is_active", true)
        .not("expiry_date", "is", null)
        .lte("expiry_date", thirtyDaysFromNow.toISOString())
        .gte("expiry_date", new Date().toISOString())
        .order("expiry_date", { ascending: true });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const getDaysUntil = (date: string) => {
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, variant: "destructive" as const };
    if (days === 0) return { text: "Today", variant: "destructive" as const };
    if (days <= 7) return { text: `${days} days`, variant: "destructive" as const };
    if (days <= 14) return { text: `${days} days`, variant: "outline" as const };
    return { text: `${days} days`, variant: "secondary" as const };
  };

  const getDaysOverdue = (date: string) => {
    const days = differenceInDays(new Date(), new Date(date));
    if (days <= 3) return { text: `${days}d overdue`, variant: "outline" as const };
    if (days <= 14) return { text: `${days}d overdue`, variant: "destructive" as const };
    return { text: `${days}d overdue`, variant: "destructive" as const };
  };

  const alertCounts = {
    warranty: expiringWarranties.length,
    maintenance: maintenanceDue.length,
    overdue: overdueCheckins.length,
    licenses: expiringLicenses.length
  };

  const totalAlerts = Object.values(alertCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="h-full flex flex-col bg-background overflow-auto">
      <div className="p-3 space-y-3">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Calendar} value={alertCounts.warranty} label="Warranty Expiring"
            colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
            onClick={() => setActiveTab("warranty")} active={activeTab === "warranty"}
          />
          <StatCard
            icon={Wrench} value={alertCounts.maintenance} label="Repair Due"
            colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
            onClick={() => setActiveTab("maintenance")} active={activeTab === "maintenance"}
          />
          <StatCard
            icon={AlertTriangle} value={alertCounts.overdue} label="Assets Overdue"
            colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            onClick={() => setActiveTab("overdue")} active={activeTab === "overdue"}
          />
          <StatCard
            icon={FileText} value={alertCounts.licenses} label="Licenses Expiring"
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            onClick={() => setActiveTab("licenses")} active={activeTab === "licenses"}
          />
        </div>

        {/* Alert Details - controlled tabs */}
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4 rounded-none border-b bg-transparent">
                <TabsTrigger value="warranty" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  Warranty ({alertCounts.warranty})
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  Repair ({alertCounts.maintenance})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  Overdue ({alertCounts.overdue})
                </TabsTrigger>
                <TabsTrigger value="licenses" className="text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  Licenses ({alertCounts.licenses})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="warranty" className="mt-0 animate-in fade-in-0 duration-200">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Warranty Expiry</TableHead>
                      <TableHead>Days Until</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringWarranties.map((asset) => {
                      const daysInfo = getDaysUntil(asset.warranty_expiry);
                      return (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell><span className="text-primary hover:underline cursor-pointer font-mono text-xs" onClick={() => navigate(`/assets/detail/${asset.asset_tag || asset.asset_id || asset.id}`)}>{asset.asset_tag || asset.asset_id}</span></TableCell>
                          <TableCell>{format(new Date(asset.warranty_expiry), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={daysInfo.variant}>{daysInfo.text}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/assets/detail/${asset.asset_tag || asset.id}`)}
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

              <TabsContent value="maintenance" className="mt-0 animate-in fade-in-0 duration-200">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
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
                          No pending repairs
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="overdue" className="mt-0 animate-in fade-in-0 duration-200">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueCheckins.map((assignment) => {
                      const expectedReturn = (assignment as any).expected_return_date as string;
                      const daysInfo = getDaysOverdue(expectedReturn);
                      return (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.asset?.name || 'N/A'}</TableCell>
                          <TableCell>{getUserName(assignment.assigned_to)}</TableCell>
                          <TableCell>
                            {expectedReturn
                              ? format(new Date(expectedReturn), 'MMM dd, yyyy') 
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={daysInfo.variant}>{daysInfo.text}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/assets/detail/${assignment.asset?.asset_tag || assignment.asset_id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

              <TabsContent value="licenses" className="mt-0 animate-in fade-in-0 duration-200">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>License Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Until</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
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
