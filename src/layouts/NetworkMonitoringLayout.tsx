import { Network, LayoutDashboard, Server, AlertTriangle, FileText, BarChart3 } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const sidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/network-monitoring", icon: LayoutDashboard },
  { title: "Devices", url: "/network-monitoring/devices", icon: Server },
  { title: "Alerts", url: "/network-monitoring/alerts", icon: AlertTriangle },
  { title: "Ping Logs", url: "/network-monitoring/ping-logs", icon: FileText },
  { title: "Reports", url: "/network-monitoring/reports", icon: BarChart3 },
];

export default function NetworkMonitoringLayout() {
  return <ModuleLayout moduleName="Network Monitoring" moduleIcon={Network} sidebarItems={sidebarItems} />;
}
