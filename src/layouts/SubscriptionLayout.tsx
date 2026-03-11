import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, LayoutDashboard, ListChecks, Key, Receipt, Building2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUB_QUERY_KEYS } from "@/lib/subscriptions/subscriptionUtils";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const subscriptionSidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/subscription", icon: LayoutDashboard },
  { title: "All Subscriptions", url: "/subscription/tools", icon: ListChecks },
  { title: "Licenses", url: "/subscription/advanced?tab=licenses", icon: Key },
  { title: "Payments", url: "/subscription/advanced?tab=payments", icon: Receipt },
  { title: "Vendors", url: "/subscription/advanced?tab=vendors", icon: Building2 },
  { title: "Advanced", url: "/subscription/advanced", icon: Settings },
];

export default function SubscriptionLayout() {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: [...SUB_QUERY_KEYS.toolsDashboard],
      queryFn: async () => {
        const { data } = await supabase
          .from("subscriptions_tools")
          .select("*, subscriptions_vendors(name)");
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: [...SUB_QUERY_KEYS.licensesDashboard],
      queryFn: async () => {
        const { data } = await supabase
          .from("subscriptions_licenses")
          .select("id, tool_id, status");
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["subscriptions-vendors"],
      queryFn: async () => {
        const { data } = await supabase
          .from("subscriptions_vendors")
          .select("*")
          .order("name");
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: [...SUB_QUERY_KEYS.payments],
      queryFn: async () => {
        const { data } = await supabase
          .from("subscriptions_payments")
          .select("id, amount, currency, status")
          .order("payment_date", { ascending: false })
          .limit(100);
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  return <ModuleLayout moduleName="Subscriptions" moduleIcon={CreditCard} sidebarItems={subscriptionSidebarItems} />;
}
