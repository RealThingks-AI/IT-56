import { ClipboardList, LayoutDashboard, List, User, Kanban, BarChart3, Activity } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const sidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/it-tasks", icon: LayoutDashboard },
  { title: "All Tasks", url: "/it-tasks/all", icon: List },
  { title: "My Tasks", url: "/it-tasks/my-tasks", icon: User },
  { title: "Kanban Board", url: "/it-tasks/kanban", icon: Kanban },
  { title: "Reports", url: "/it-tasks/reports", icon: BarChart3 },
  { title: "Activity Log", url: "/it-tasks/activity", icon: Activity },
];

export default function ITTasksLayout() {
  return <ModuleLayout moduleName="IT Tasks" moduleIcon={ClipboardList} sidebarItems={sidebarItems} />;
}
