import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { Key, Receipt, Building2, FileSpreadsheet } from "lucide-react";
import { LicensesList } from "@/components/Subscriptions/LicensesList";
import { PaymentsList } from "@/components/Subscriptions/PaymentsList";
import { VendorsList } from "@/components/Subscriptions/VendorsList";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SubscriptionImportExport = lazy(() => import("@/pages/helpdesk/subscription/import-export"));

const TabFallback = () => (
  <div className="p-4 space-y-3">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
  </div>
);

const TABS = [
  { value: "licenses", label: "Licenses", icon: Key },
  { value: "payments", label: "Payments", icon: Receipt },
  { value: "vendors", label: "Vendors", icon: Building2 },
  { value: "import-export", label: "Import/Export", icon: FileSpreadsheet },
] as const;

export default function SubscriptionAdvanced() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "licenses";

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // Use Button-based tab bar (not Tabs component) to avoid portal context issue
  const portalTarget = document.getElementById("module-header-portal");
  const tabBarContent = (
    <div className="flex items-center gap-0.5 flex-1 min-w-0">
      {TABS.map(tab => (
        <Button
          key={tab.value}
          variant="ghost"
          size="sm"
          onClick={() => handleTabChange(tab.value)}
          className={cn(
            "h-7 gap-1.5 px-2.5 text-xs rounded-md transition-colors",
            activeTab === tab.value
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <tab.icon className="h-3 w-3" /> {tab.label}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-300">
      {portalTarget ? createPortal(tabBarContent, portalTarget) : (
        <div className="shrink-0 px-3 pt-2 flex items-center gap-0.5">
          {tabBarContent}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "licenses" && <LicensesList />}
        {activeTab === "payments" && <PaymentsList />}
        {activeTab === "vendors" && <VendorsList />}
        {activeTab === "import-export" && (
          <Suspense fallback={<TabFallback />}>
            <SubscriptionImportExport />
          </Suspense>
        )}
      </div>
    </div>
  );
}
