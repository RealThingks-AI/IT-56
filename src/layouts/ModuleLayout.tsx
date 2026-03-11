import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ModuleSidebar, type SidebarItem } from "@/components/ModuleSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";
import { Suspense, useState, useEffect, useRef } from "react";

const ContentLoader = () => (
  <div className="flex-1 flex items-center justify-center h-full">
    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const routeTitles: Record<string, string> = {
  // Assets module
  "/assets/add": "Add an Asset",
  "/assets/checkout": "Check Out Asset",
  "/assets/checkin": "Check In Asset",
  "/assets/reports": "Asset Reports",
  "/assets/depreciation": "Depreciation",
  "/assets/vendors/add-vendor": "Add Vendor",
  "/assets/licenses": "Software Licenses",
  "/assets/licenses/add-license": "Add License",
  "/assets/licenses/allocate": "Allocate License",
  "/assets/repairs/create": "Create Repair",
  "/assets/purchase-orders": "Purchase Orders",
  "/assets/purchase-orders/create-po": "Create Purchase Order",
  "/assets/logs": "Asset Logs",
  "/assets/explore/bulk-actions": "Bulk Actions",
  "/assets/dashboard": "Asset Dashboard",
  "/assets/allassets": "All Assets",
  "/assets/alerts": "Asset Alerts",
  "/assets/dispose": "Dispose Asset",
  
  "/assets/import-export": "Import / Export",
  "/assets/advanced": "Asset Management",
  "/assets/verification": "Asset Verification",
  // Subscription module
  "/subscription": "Subscription Dashboard",
  "/subscription/tools": "All Subscriptions",
  "/subscription/advanced": "Subscription Management",
  // IT Tasks module
  "/it-tasks": "IT Tasks Dashboard",
  "/it-tasks/all": "All Tasks",
  "/it-tasks/my-tasks": "My Tasks",
  "/it-tasks/kanban": "Kanban Board",
  "/it-tasks/reports": "Task Reports",
  // Network Monitoring module
  "/network-monitoring": "Network Dashboard",
  "/network-monitoring/devices": "Devices",
  "/network-monitoring/alerts": "Network Alerts",
  "/network-monitoring/ping-logs": "Ping Logs",
  "/network-monitoring/reports": "Network Reports",
  // Endpoint Security module
  "/endpoint-security": "Security Dashboard",
  "/endpoint-security/endpoints": "Endpoints",
  "/endpoint-security/compliance": "Compliance",
  "/endpoint-security/alerts": "Security Alerts",
  "/endpoint-security/scans": "Scans",
  "/endpoint-security/reports": "Security Reports",
  // Boarding module
  "/onoff-boarding": "Workflow Dashboard",
  "/onoff-boarding/onboarding": "Onboarding",
  "/onoff-boarding/offboarding": "Offboarding",
  "/onoff-boarding/kanban": "Kanban Board",
  "/onoff-boarding/templates": "Templates",
  "/onoff-boarding/reports": "Workflow Reports",
};

function getDynamicTitle(pathname: string): string | null {
  if (pathname.startsWith("/assets/detail/")) return "Asset Details";
  if (pathname.startsWith("/assets/vendors/detail/")) return "Vendor Details";
  if (pathname.startsWith("/assets/licenses/detail/")) return "License Details";
  if (pathname.startsWith("/assets/repairs/detail/")) return "Repair Details";
  if (pathname.startsWith("/assets/purchase-orders/po-detail/")) return "Purchase Order Details";
  if (pathname.startsWith("/assets/depreciation/ledger/")) return "Depreciation Ledger";
  if (pathname.startsWith("/assets/depreciation/profile-detail/")) return "Depreciation Profile";
  if (pathname.startsWith("/subscription/detail/")) return "Subscription Details";
  if (pathname.startsWith("/network-monitoring/device-detail/")) return "Device Details";
  if (pathname.startsWith("/endpoint-security/endpoint-detail/")) return "Endpoint Details";
  if (pathname.startsWith("/onoff-boarding/workflow-detail/")) return "Workflow Details";
  return null;
}

interface ModuleLayoutProps {
  moduleName: string;
  moduleIcon: LucideIcon;
  sidebarItems: SidebarItem[];
  pageTitle?: string;
}

export default function ModuleLayout({ moduleName, moduleIcon, sidebarItems, pageTitle }: ModuleLayoutProps) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const portalRef = useRef<HTMLDivElement>(null);
  const [portalHasContent, setPortalHasContent] = useState(false);

  // Watch portal for child content via MutationObserver
  useEffect(() => {
    const el = portalRef.current;
    if (!el) return;
    const check = () => setPortalHasContent(el.childNodes.length > 0);
    check();
    const observer = new MutationObserver(check);
    observer.observe(el, { childList: true });
    return () => observer.disconnect();
  }, [pathname]);

  const derivedTitle = pageTitle || routeTitles[pathname] || getDynamicTitle(pathname) || moduleName;

  if (!loading && !user) return <Navigate to="/login" replace />;

  // Only show skeleton when we have no user yet (first load). Skip if user is already cached.
  if (loading && !user) {
    return (
      <div className="h-screen flex w-full overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-[180px] h-screen border-r bg-background flex flex-col shrink-0">
          <div className="h-10 border-b flex items-center px-4"><Skeleton className="h-5 w-24" /></div>
          <div className="flex-1 py-2 px-2 space-y-1">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
          </div>
        </div>
        {/* Main skeleton */}
        <div className="flex-1 h-screen flex flex-col bg-background">
          <div className="h-11 border-b flex items-center px-4"><Skeleton className="h-4 w-32" /></div>
          <div className="flex-1 p-4 space-y-3">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-lg" />)}</div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <ModuleSidebar moduleName={moduleName} moduleIcon={moduleIcon} items={sidebarItems} />
      <main className="flex-1 h-screen flex flex-col bg-background overflow-hidden">
        <header className="bg-background px-4 flex items-center justify-between shrink-0 h-11 border-b">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground whitespace-nowrap">{derivedTitle}</h1>
            <div id="module-header-portal" ref={portalRef} className="flex-1" />
          </div>
        </header>
        <div id="module-subheader-portal" className="shrink-0" />
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
