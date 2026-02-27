import { Suspense, lazy } from "react";
import { SettingsLoadingSkeleton } from "@/components/settings/SettingsLoadingSkeleton";

const AdminUsers = lazy(() => import("@/components/settings/AdminUsers").then(m => ({ default: m.AdminUsers })));

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <div className="h-full overflow-auto p-4"><AdminUsers /></div>
    </Suspense>
  );
}
