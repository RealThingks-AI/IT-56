import { ShieldAlert, LayoutDashboard, Monitor, CheckSquare, AlertTriangle, Search, BarChart3, HardDrive, Download } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const sidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/endpoint-security", icon: LayoutDashboard },
  { title: "Endpoints", url: "/endpoint-security/endpoints", icon: Monitor },
  { title: "Compliance", url: "/endpoint-security/compliance", icon: CheckSquare },
  { title: "Alerts", url: "/endpoint-security/alerts", icon: AlertTriangle },
  { title: "Scans", url: "/endpoint-security/scans", icon: Search },
  { title: "Reports", url: "/endpoint-security/reports", icon: BarChart3 },
  {
    title: "Patching",
    url: "/endpoint-security/patching/devices",
    icon: Download,
    children: [
      { title: "Devices", url: "/endpoint-security/patching/devices", icon: HardDrive },
      { title: "Updates", url: "/endpoint-security/patching/updates", icon: Download },
    ],
  },
];

export default function EndpointSecurityLayout() {
  return <ModuleLayout moduleName="Endpoint Security" moduleIcon={ShieldAlert} sidebarItems={sidebarItems} />;
}
