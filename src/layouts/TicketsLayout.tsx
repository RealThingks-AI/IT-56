import { Ticket, LayoutDashboard, List, AlertTriangle, PlusCircle, GitBranch, Clock, Users2, Zap, BarChart3, Settings } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const ticketsSidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/tickets", icon: LayoutDashboard },
  { title: "All Tickets", url: "/tickets/list", icon: List },
  { title: "Create Ticket", url: "/tickets/create", icon: PlusCircle },
  { title: "Problems", url: "/tickets/problems", icon: AlertTriangle },
  { title: "Assignment Rules", url: "/tickets/assignment-rules", icon: GitBranch },
  { title: "SLA Policies", url: "/sla", icon: Clock },
  { title: "Queues", url: "/queues", icon: Users2 },
  { title: "Automation", url: "/automation", icon: Zap },
  { title: "Reports", url: "/tickets/reports", icon: BarChart3 },
  { title: "Advanced", url: "/tickets/settings", icon: Settings },
];

export default function TicketsLayout() {
  return <ModuleLayout moduleName="Tickets" moduleIcon={Ticket} sidebarItems={ticketsSidebarItems} />;
}
