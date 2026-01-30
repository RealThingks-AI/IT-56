import { Suspense, lazy } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { Users, Lock, ScrollText, Settings2, BarChart3, HardDrive } from "lucide-react";
import { SettingsLoadingSkeleton } from "@/components/settings/SettingsLoadingSkeleton";

// Lazy load settings components
const AdminUsers = lazy(() => import("@/components/settings/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminAccess = lazy(() => import("@/components/settings/AdminAccess").then(m => ({ default: m.AdminAccess })));
const AdminLogs = lazy(() => import("@/components/settings/AdminLogs").then(m => ({ default: m.AdminLogs })));
const AdminSystem = lazy(() => import("@/components/settings/AdminSystem").then(m => ({ default: m.AdminSystem })));
const AdminReports = lazy(() => import("@/components/settings/AdminReports").then(m => ({ default: m.AdminReports })));
const AdminBackup = lazy(() => import("@/components/settings/AdminBackup").then(m => ({ default: m.AdminBackup })));

type AdminSection = "users" | "access" | "logs" | "system" | "backup" | "reports";

const ADMIN_SECTIONS: { id: AdminSection; label: string; icon: typeof Users }[] = [
  { id: "users", label: "Users", icon: Users },
  { id: "access", label: "Access", icon: Lock },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "system", label: "System", icon: Settings2 },
  { id: "backup", label: "Backup", icon: HardDrive },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function SettingsModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdminOrAbove: isAdmin } = useUserRole();

  const activeSection = (searchParams.get("section") as AdminSection) || "users";

  // Redirect old account tab to new account page
  if (searchParams.get("tab") === "account") {
    return <Navigate to="/account" replace />;
  }

  const setActiveSection = (section: AdminSection) => {
    setSearchParams({ section });
  };

  const renderContent = () => {
    switch (activeSection) {
      case "users":
        return <AdminUsers />;
      case "access":
        return <AdminAccess />;
      case "logs":
        return <AdminLogs />;
      case "system":
        return <AdminSystem />;
      case "backup":
        return <AdminBackup />;
      case "reports":
        return <AdminReports />;
      default:
        return <AdminUsers />;
    }
  };

  const portalTarget = document.getElementById("settings-header-portal");

  const tabsContent = (
    <div className="flex items-center">
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {ADMIN_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3 w-3" />
              {section.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full p-4">
      {portalTarget && createPortal(tabsContent, portalTarget)}

      {/* Content */}
      <Suspense fallback={<SettingsLoadingSkeleton cards={2} rows={4} />}>
        {renderContent()}
      </Suspense>
    </div>
  );
}
