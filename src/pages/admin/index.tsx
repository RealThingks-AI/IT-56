import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { SettingsLoadingSkeleton } from "@/components/settings/SettingsLoadingSkeleton";

const AdminUsers = lazy(() => import("@/components/settings/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminLogs = lazy(() => import("@/components/settings/AdminLogs").then(m => ({ default: m.AdminLogs })));
const AdminSystem = lazy(() => import("@/components/settings/AdminSystem").then(m => ({ default: m.AdminSystem })));
const AdminReports = lazy(() => import("@/components/settings/AdminReports").then(m => ({ default: m.AdminReports })));
const AdminBackup = lazy(() => import("@/components/settings/AdminBackup").then(m => ({ default: m.AdminBackup })));

const sectionMap: Record<string, React.LazyExoticComponent<any>> = {
  users: AdminUsers,
  logs: AdminLogs,
  system: AdminSystem,
  backup: AdminBackup,
  reports: AdminReports,
};

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section") || "default";

  // The section is determined by the route, e.g. /admin/users -> render AdminUsers
  // This component is used as a catch-all; individual routes render specific sections
  const Component = sectionMap[section];

  if (Component) {
    return (
      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <div className="h-full overflow-auto p-4">
          <Component />
        </div>
      </Suspense>
    );
  }

  // Default: show users
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <div className="h-full overflow-auto p-4">
        <AdminUsers />
      </div>
    </Suspense>
  );
}
