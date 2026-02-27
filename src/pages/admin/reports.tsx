import { Suspense, lazy } from "react";
import { SettingsLoadingSkeleton } from "@/components/settings/SettingsLoadingSkeleton";

const AdminReports = lazy(() => import("@/components/settings/AdminReports").then(m => ({ default: m.AdminReports })));

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <div className="h-full overflow-auto p-4"><AdminReports /></div>
    </Suspense>
  );
}
