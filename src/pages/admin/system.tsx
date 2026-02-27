import { Suspense, lazy } from "react";
import { SettingsLoadingSkeleton } from "@/components/settings/SettingsLoadingSkeleton";

const AdminSystem = lazy(() => import("@/components/settings/AdminSystem").then(m => ({ default: m.AdminSystem })));

export default function AdminSystemPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <div className="h-full overflow-auto p-4"><AdminSystem /></div>
    </Suspense>
  );
}
