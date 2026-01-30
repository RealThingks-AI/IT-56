import { Outlet, useLocation } from "react-router-dom";
import { HelpdeskSidebar } from "@/components/helpdesk/HelpdeskSidebar";
import { NotificationPanel } from "@/components/NotificationPanel";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/tickets": "All Tickets",
  "/tickets/create": "Create Ticket",
  "/tickets/assignment-rules": "Ticket Assignment Rules",
  "/tickets/closed-archive": "Closed Tickets Archive",
  "/tickets/linked-problems": "Linked Problems",
  "/tickets/reports": "Ticket Reports",
  "/new": "New Ticket",
  "/queues": "Queues",
  "/sla": "SLA Policies",
  "/assets": "Assets Overview",
  "/assets/add": "Add an Asset",
  "/assets/dashboard": "Asset Dashboard",
  "/assets/alerts": "Asset Alerts",
  "/assets/allassets": "All Assets",
  "/assets/checkout": "Check Out Asset",
  "/assets/checkin": "Check In Asset",
  "/assets/dispose": "Dispose Asset",
  "/assets/reserve": "Reserve Asset",
  "/assets/lists/maintenances": "Maintenance List",
  "/assets/lists/warranties": "Warranty List",
  "/assets/lists/contracts": "Contracts List",
  "/assets/setup": "Asset Setup",
  "/assets/setup/fields-setup": "Fields Setup",
  "/assets/tools": "Asset Tools",
  "/assets/reports": "Asset Reports",
  "/assets/audit": "Asset Audit",
  "/assets/explore/bulk-actions": "Bulk Actions",
  "/assets/explore/reports": "Asset Reports",
  "/assets/repairs": "Repairs & Maintenance",
  "/assets/repairs/create": "Create Repair",
  "/assets/licenses": "Software Licenses",
  "/assets/licenses/add-license": "Add License",
  "/assets/licenses/allocate": "Allocate License",
  "/assets/purchase-orders": "Purchase Orders",
  "/assets/purchase-orders/create-po": "Create Purchase Order",
  "/assets/vendors": "Vendors",
  "/assets/vendors/add-vendor": "Add Vendor",
  "/assets/depreciation": "Depreciation",
  "/assets/depreciation/run": "Run Depreciation",
  "/assets/depreciation/reports": "Depreciation Reports",
  "/assets/depreciation/profile-create": "Create Depreciation Profile",
  "/kb": "Knowledge Base",
  "/problems": "Problem Management",
  "/changes": "Change Management",
  "/automation": "Automation Rules",
  "/subscription": "Subscription Dashboard",
  "/subscription/dashboard": "Subscription Dashboard",
  "/subscription/list": "Subscriptions List",
  "/subscription/add": "Add Subscription",
  "/subscription/tools": "Subscription Tools",
  "/subscription/vendors": "Subscription Vendors",
  "/subscription/licenses": "Subscription Licenses",
  "/subscription/payments": "Subscription Payments",
  "/subscription/alerts": "Subscription Alerts",
  "/subscription/reports": "Subscription Reports",
  "/system-updates": "System Updates",
  "/system-updates/devices": "Devices",
  "/system-updates/updates": "Updates",
  "/system-updates/ingest-log": "Ingest Log",
  "/system-updates/settings": "Update Settings",
  "/monitoring": "Monitoring",
  "/reports": "Reports & Analytics",
  "/audit": "Audit Logs",
  "/admin": "Admin Panel",
  "/settings": "Settings",
  "/account": "Account Settings"
};

// Pages that render their own tabs/header in the portal area - don't show default title
const pagesWithCustomHeader = [
  "/tickets",
  "/problems",
  "/reports",
  "/monitoring",
  "/audit"
];

// Pages that have their own inline h2 headers - don't show default title
const pagesWithInlineHeader = [
  "/automation",
  "/sla",
  "/queues",
  "/changes",
  "/dashboard"
];

const HelpdeskLayout = () => {
  const location = useLocation();

  // Handle dynamic routes
  let pageTitle = routeTitles[location.pathname] || "IT Helpdesk";
  if (location.pathname.startsWith("/tickets/") && location.pathname !== "/tickets" && !location.pathname.includes("/create") && !location.pathname.includes("/assignment-rules") && !location.pathname.includes("/closed-archive") && !location.pathname.includes("/linked-problems") && !location.pathname.includes("/reports")) {
    pageTitle = "Ticket Details";
  } else if (location.pathname.startsWith("/problems/") && location.pathname !== "/problems") {
    pageTitle = "Problem Details";
  } else if (location.pathname.startsWith("/assets/detail/")) {
    pageTitle = "Asset Details";
  } else if (location.pathname.startsWith("/assets/repairs/detail/")) {
    pageTitle = "Repair Details";
  } else if (location.pathname.startsWith("/assets/purchase-orders/po-detail/")) {
    pageTitle = "Purchase Order Details";
  } else if (location.pathname.startsWith("/assets/vendors/detail/")) {
    pageTitle = "Vendor Details";
  } else if (location.pathname.startsWith("/assets/depreciation/ledger/")) {
    pageTitle = "Depreciation Ledger";
  } else if (location.pathname.startsWith("/assets/depreciation/profile-detail/")) {
    pageTitle = "Depreciation Profile";
  } else if (location.pathname.startsWith("/subscription/detail/")) {
    pageTitle = "Subscription Details";
  } else if (location.pathname.startsWith("/system-updates/device-detail/")) {
    pageTitle = "Device Details";
  } else if (location.pathname.startsWith("/system-updates/update-detail/")) {
    pageTitle = "Update Details";
  }

  // Determine if we should show the default header title
  const hasCustomHeader = pagesWithCustomHeader.some(path => location.pathname === path);
  const hasInlineHeader = pagesWithInlineHeader.some(path => location.pathname === path);
  const showDefaultTitle = !hasCustomHeader && !hasInlineHeader;

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <HelpdeskSidebar />

      <main className="flex-1 h-screen flex flex-col bg-background overflow-hidden will-change-auto">
        <header className="border-b px-4 flex items-center justify-between shrink-0 h-11">
          <div id="helpdesk-header-left" className="flex items-center gap-3">
            {showDefaultTitle && (
              <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
            )}
            <div id="settings-header-portal" />
          </div>

          <div className="flex items-center">
            <NotificationPanel />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default HelpdeskLayout;