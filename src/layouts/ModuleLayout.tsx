import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ModuleSidebar, type SidebarItem } from "@/components/ModuleSidebar";
import { LucideIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const routeTitles: Record<string, string> = {
  "/assets/add": "Add an Asset",
  "/assets/checkout": "Check Out Asset",
  "/assets/checkin": "Check In Asset",
  "/assets/reports": "Asset Reports",
  "/assets/depreciation": "Depreciation",
  "/assets/vendors": "Vendors",
  "/assets/vendors/add-vendor": "Add Vendor",
  "/assets/licenses": "Software Licenses",
  "/assets/licenses/add-license": "Add License",
  "/assets/licenses/allocate": "Allocate License",
  "/assets/repairs": "Repairs & Maintenance",
  "/assets/repairs/create": "Create Repair",
  "/assets/purchase-orders": "Purchase Orders",
  "/assets/purchase-orders/create-po": "Create Purchase Order",
  "/assets/audit": "Asset Audit",
  "/assets/logs": "Asset Logs",
  "/assets/explore/bulk-actions": "Bulk Actions",
  "/assets/dashboard": "Asset Dashboard",
  "/assets/allassets": "All Assets",
  "/assets/alerts": "Asset Alerts",
  "/assets/dispose": "Dispose Asset",
  "/assets/reserve": "Reserve Asset",
  "/assets/import-export": "Import / Export",
  "/assets/advanced": "Asset Management",
  "/assets/lists": "Custom Lists",
};

function getDynamicTitle(pathname: string): string | null {
  if (pathname.startsWith("/assets/detail/")) return "Asset Details";
  if (pathname.startsWith("/assets/vendors/detail/")) return "Vendor Details";
  if (pathname.startsWith("/assets/licenses/detail/")) return "License Details";
  if (pathname.startsWith("/assets/repairs/detail/")) return "Repair Details";
  if (pathname.startsWith("/assets/purchase-orders/po-detail/")) return "Purchase Order Details";
  if (pathname.startsWith("/assets/depreciation/ledger/")) return "Depreciation Ledger";
  if (pathname.startsWith("/assets/depreciation/profile-detail/")) return "Depreciation Profile";
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

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <ModuleSidebar moduleName={moduleName} moduleIcon={moduleIcon} items={sidebarItems} />
      <main className="flex-1 h-screen flex flex-col bg-background overflow-hidden">
        <div id="module-header-portal" ref={portalRef} className="hidden" />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
