import { Suspense, lazy } from "react";
import { SettingsLoadingSkeleton } from "@/components/settings/SettingsLoadingSkeleton";

const AdminLogs = lazy(() => import("@/components/settings/AdminLogs").then(m => ({ default: m.AdminLogs })));

export default function AdminLogsPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <div className="h-full overflow-auto p-4"><AdminLogs /></div>
    </Suspense>
  );
}
