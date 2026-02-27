import { Package, LayoutDashboard, List, PlusCircle, LogOut, LogIn, Settings } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const assetsSidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/assets/dashboard", icon: LayoutDashboard },
  { title: "All Assets", url: "/assets/allassets", icon: List },
  { title: "Add Asset", url: "/assets/add", icon: PlusCircle },
  { title: "Check Out", url: "/assets/checkout", icon: LogOut },
  { title: "Check In", url: "/assets/checkin", icon: LogIn },
  { title: "Advanced", url: "/assets/advanced", icon: Settings },
];

export default function AssetsLayout() {
  return <ModuleLayout moduleName="Assets" moduleIcon={Package} sidebarItems={assetsSidebarItems} />;
}
