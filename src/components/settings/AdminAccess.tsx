import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { SettingsLoadingSkeleton } from "./SettingsLoadingSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PageAccess {
  id: string;
  route: string;
  page_name: string;
  description: string | null;
  admin_access: boolean;
  manager_access: boolean;
  user_access: boolean;
  viewer_access: boolean;
  updated_at: string | null;
}

// Main modules only - subpages inherit access from parent
const DEFAULT_PAGES: Omit<PageAccess, "id" | "updated_at">[] = [
  { route: "/", page_name: "Dashboard", description: "Overview and stats", admin_access: true, manager_access: true, user_access: true, viewer_access: true },
  { route: "/tickets", page_name: "Tickets", description: "Helpdesk tickets", admin_access: true, manager_access: true, user_access: true, viewer_access: true },
  { route: "/assets", page_name: "Assets", description: "IT asset management", admin_access: true, manager_access: true, user_access: true, viewer_access: true },
  { route: "/subscription", page_name: "Subscriptions", description: "Subscription management", admin_access: true, manager_access: true, user_access: false, viewer_access: false },
  { route: "/system-updates", page_name: "System Updates", description: "Windows update tracking", admin_access: true, manager_access: true, user_access: false, viewer_access: false },
  { route: "/monitoring", page_name: "Monitoring", description: "Service health monitoring", admin_access: true, manager_access: true, user_access: false, viewer_access: false },
  { route: "/reports", page_name: "Reports", description: "Analytics and reports", admin_access: true, manager_access: true, user_access: false, viewer_access: false },
  { route: "/audit", page_name: "Audit", description: "Audit logs", admin_access: true, manager_access: true, user_access: false, viewer_access: false },
  { route: "/settings", page_name: "Settings", description: "Admin settings", admin_access: true, manager_access: false, user_access: false, viewer_access: false },
];

// Routes that should always be allowed for all authenticated users (not shown in UI)
const ALWAYS_ALLOWED_ROUTES = ["/account", "/notifications", "/profile"];

export function AdminAccess() {
  const { organisation, loading: orgLoading } = useOrganisation();
  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);

  const { data: pages, isLoading, error, refetch } = useQuery({
    queryKey: ["page-access-control", organisation?.id],
    queryFn: async () => {
      if (!organisation?.id) return [];
      
      const { data, error } = await supabase
        .from("page_access_control")
        .select("*")
        .eq("organisation_id", organisation.id)
        .order("page_name");
      
      if (error) throw error;
      
      // Filter to only show main module pages (exclude always-allowed and removed pages)
      const mainRoutes = DEFAULT_PAGES.map(p => p.route);
      return (data as PageAccess[]).filter(p => mainRoutes.includes(p.route));
    },
    enabled: !!organisation?.id,
  });

  // Auto-seed defaults if table is empty or missing pages
  useEffect(() => {
    if (pages !== undefined && organisation?.id && !isSeeding) {
      const existingRoutes = pages.map(p => p.route);
      const missingPages = DEFAULT_PAGES.filter(p => !existingRoutes.includes(p.route));
      
      if (missingPages.length > 0) {
        seedDefaultPages(missingPages);
      }
    }
  }, [pages, organisation?.id, isSeeding]);

  const seedDefaultPages = async (pagesToAdd: typeof DEFAULT_PAGES) => {
    if (!organisation?.id || isSeeding) return;
    
    setIsSeeding(true);
    try {
      const pagesToInsert = pagesToAdd.map((page) => ({
        organisation_id: organisation.id,
        ...page,
      }));

      const { error } = await supabase
        .from("page_access_control")
        .insert(pagesToInsert);

      if (error) {
        console.error("Error seeding default pages:", error);
        toast.error("Failed to initialize access control settings");
      } else {
        refetch();
      }
    } catch (err) {
      console.error("Error seeding defaults:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ 
      pageId, 
      field, 
      value 
    }: { 
      pageId: string; 
      field: "admin_access" | "manager_access" | "user_access" | "viewer_access"; 
      value: boolean 
    }) => {
      const { error } = await supabase
        .from("page_access_control")
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all access-related queries for immediate effect
      queryClient.invalidateQueries({ queryKey: ["page-access-control"] });
      queryClient.invalidateQueries({ queryKey: ["page-access"] });
      queryClient.invalidateQueries({ queryKey: ["page-access-multiple"] });
      toast.success("Access updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const handleToggle = (
    pageId: string,
    field: "admin_access" | "manager_access" | "user_access" | "viewer_access",
    currentValue: boolean
  ) => {
    // Don't allow disabling admin access
    if (field === "admin_access" && currentValue) {
      toast.error("Cannot remove admin access");
      return;
    }

    updateMutation.mutate({ pageId, field, value: !currentValue });
  };

  if (orgLoading) {
    return <SettingsLoadingSkeleton cards={1} rows={8} />;
  }

  if (!organisation?.id) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Page Access Control</h2>
          <p className="text-xs text-muted-foreground">Configure role-based page access</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Unable to load organisation data.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || isSeeding) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Page Access Control</h2>
          <p className="text-xs text-muted-foreground">Configure role-based page access</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            {isSeeding ? "Initializing..." : "Loading..."}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Page Access Control</h2>
          <p className="text-xs text-muted-foreground">Configure role-based page access</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load: {(error as Error).message}</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Page Access Control</h2>
          <p className="text-xs text-muted-foreground">
            Configure role-based page access. Subpages inherit parent access.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="h-8">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Access Control Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 h-9">
              <TableHead className="w-[100px] text-xs font-medium pl-3">Name</TableHead>
              <TableHead className="w-[150px] text-xs font-medium">Description</TableHead>
              <TableHead className="w-[100px] text-xs font-medium">Route</TableHead>
              <TableHead className="w-[50px] text-center text-xs font-medium">Admin</TableHead>
              <TableHead className="w-[50px] text-center text-xs font-medium">Mgr</TableHead>
              <TableHead className="w-[50px] text-center text-xs font-medium">User</TableHead>
              <TableHead className="w-[50px] text-center text-xs font-medium pr-3">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages && pages.length > 0 ? (
              pages.map((page, idx) => (
                <TableRow key={page.id} className={`h-9 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <TableCell className="py-1.5 pl-3 font-medium text-xs truncate max-w-[100px]">{page.page_name}</TableCell>
                  <TableCell className="py-1.5 text-xs text-muted-foreground truncate max-w-[150px]">{page.description}</TableCell>
                  <TableCell className="py-1.5">
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                      {page.route}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1.5 text-center">
                    <Switch
                      checked={page.admin_access}
                      onCheckedChange={() => handleToggle(page.id, "admin_access", page.admin_access)}
                      disabled
                      className="scale-75"
                    />
                  </TableCell>
                  <TableCell className="py-1.5 text-center">
                    <Switch
                      checked={page.manager_access}
                      onCheckedChange={() => handleToggle(page.id, "manager_access", page.manager_access)}
                      disabled={updateMutation.isPending}
                      className="scale-75"
                    />
                  </TableCell>
                  <TableCell className="py-1.5 text-center">
                    <Switch
                      checked={page.user_access}
                      onCheckedChange={() => handleToggle(page.id, "user_access", page.user_access)}
                      disabled={updateMutation.isPending}
                      className="scale-75"
                    />
                  </TableCell>
                  <TableCell className="py-1.5 text-center pr-3">
                    <Switch
                      checked={page.viewer_access}
                      onCheckedChange={() => handleToggle(page.id, "viewer_access", page.viewer_access)}
                      disabled={updateMutation.isPending}
                      className="scale-75"
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">
                  No pages configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info text */}
      <p className="text-[10px] text-muted-foreground">
        Account and Notifications are always accessible to all users.
      </p>
    </div>
  );
}
