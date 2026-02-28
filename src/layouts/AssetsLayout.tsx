import { Package, LayoutDashboard, List, PlusCircle, LogOut, LogIn, Settings, Users, FileDown } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const assetsSidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/assets/dashboard", icon: LayoutDashboard },
  { title: "All Assets", url: "/assets/allassets", icon: List },
  { title: "Add Asset", url: "/assets/add", icon: PlusCircle },
  { title: "Check Out", url: "/assets/checkout", icon: LogOut },
  { title: "Check In", url: "/assets/checkin", icon: LogIn },
  { title: "Employees", url: "/assets/employees", icon: Users },
  { title: "Import/Export", url: "/assets/import-export", icon: FileDown },
  { title: "Advanced", url: "/assets/advanced", icon: Settings },
];

export default function AssetsLayout() {
  return <ModuleLayout moduleName="Assets" moduleIcon={Package} sidebarItems={assetsSidebarItems} />;
}
