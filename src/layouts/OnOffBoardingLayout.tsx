import { UserPlus, LayoutDashboard, UserCheck, UserMinus, FileStack, BarChart3, Kanban } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const sidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/onoff-boarding", icon: LayoutDashboard },
  { title: "Onboarding", url: "/onoff-boarding/onboarding", icon: UserCheck },
  { title: "Offboarding", url: "/onoff-boarding/offboarding", icon: UserMinus },
  { title: "Kanban", url: "/onoff-boarding/kanban", icon: Kanban },
  { title: "Templates", url: "/onoff-boarding/templates", icon: FileStack },
  { title: "Reports", url: "/onoff-boarding/reports", icon: BarChart3 },
];

export default function OnOffBoardingLayout() {
  return <ModuleLayout moduleName="Boarding" moduleIcon={UserPlus} sidebarItems={sidebarItems} />;
}
