import { CreditCard, LayoutDashboard, ListChecks, Key, Receipt, Building2 } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const subscriptionSidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/subscription", icon: LayoutDashboard },
  { title: "All Subscriptions", url: "/subscription/tools", icon: ListChecks },
  { title: "Licenses", url: "/subscription/licenses", icon: Key },
  { title: "Payments", url: "/subscription/payments", icon: Receipt },
  { title: "Vendors", url: "/subscription/vendors", icon: Building2 },
];

export default function SubscriptionLayout() {
  return <ModuleLayout moduleName="Subscriptions" moduleIcon={CreditCard} sidebarItems={subscriptionSidebarItems} />;
}
