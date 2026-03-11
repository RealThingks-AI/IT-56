import { Activity, LayoutDashboard } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const monitoringSidebarItems: SidebarItem[] = [
  { title: "Overview", url: "/monitoring", icon: LayoutDashboard },
];

export default function MonitoringLayout() {
  return <ModuleLayout moduleName="Monitoring" moduleIcon={Activity} sidebarItems={monitoringSidebarItems} />;
}
