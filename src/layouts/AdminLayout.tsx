import { Shield, Users, ScrollText, Settings2, HardDrive, BarChart3 } from "lucide-react";
import { Navigate } from "react-router-dom";
import ModuleLayout from "./ModuleLayout";
import { useUserRole } from "@/hooks/useUserRole";
import type { SidebarItem } from "@/components/ModuleSidebar";

const adminSidebarItems: SidebarItem[] = [
  { title: "Users & Roles", url: "/admin/users", icon: Users },
  { title: "Audit Logs", url: "/admin/logs", icon: ScrollText },
  { title: "System Settings", url: "/admin/system", icon: Settings2 },
  { title: "Backup", url: "/admin/backup", icon: HardDrive },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
];

export default function AdminLayout() {
  const { isAdmin, isLoading } = useUserRole();

  if (!isLoading && !isAdmin) return <Navigate to="/access-denied" replace />;

  return <ModuleLayout moduleName="Administration" moduleIcon={Shield} sidebarItems={adminSidebarItems} />;
}
