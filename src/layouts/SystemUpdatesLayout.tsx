import { RefreshCw, LayoutDashboard, Download, Monitor, Settings } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const updatesSidebarItems: SidebarItem[] = [
  { title: "Overview", url: "/system-updates", icon: LayoutDashboard },
  { title: "All Updates", url: "/system-updates/updates", icon: Download },
  { title: "Devices", url: "/system-updates/devices", icon: Monitor },
  { title: "Settings", url: "/system-updates/settings", icon: Settings },
];

export default function SystemUpdatesLayout() {
  return <ModuleLayout moduleName="System Updates" moduleIcon={RefreshCw} sidebarItems={updatesSidebarItems} />;
}
