import { Suspense, lazy } from "react";
import { SettingsLoadingSkeleton } from "@/components/settings/SettingsLoadingSkeleton";

const AdminBackup = lazy(() => import("@/components/settings/AdminBackup").then(m => ({ default: m.AdminBackup })));

export default function AdminBackupPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <div className="h-full overflow-auto p-4"><AdminBackup /></div>
    </Suspense>
  );
}
