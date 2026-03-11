import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package, LayoutDashboard, List, PlusCircle, LogOut, LogIn, Settings, Users, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";
import { CONFIRMATION_OVERDUE_DAYS } from "@/lib/assets/assetStatusUtils";

const assetsSidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/assets/dashboard", icon: LayoutDashboard },
  { title: "All Assets", url: "/assets/allassets", icon: List },
  { title: "Add Asset", url: "/assets/add", icon: PlusCircle },
  { title: "Check Out", url: "/assets/checkout", icon: LogOut },
  { title: "Check In", url: "/assets/checkin", icon: LogIn },
  { title: "Verification", url: "/assets/verification", icon: ShieldCheck },
  { title: "Employees", url: "/assets/employees", icon: Users },
  { title: "Advanced", url: "/assets/advanced", icon: Settings },
];

export default function AssetsLayout() {
  const queryClient = useQueryClient();

  // Prefetch critical data on mount for instant navigation
  useEffect(() => {
    const prefetchOptions = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 };

    queryClient.prefetchQuery({
      queryKey: ["itam-assets-dashboard-full"],
      queryFn: async () => {
        const { data } = await supabase.from("itam_assets").select("id, asset_id, asset_tag, name, status, is_active, purchase_price, purchase_date, warranty_expiry, expected_return_date, checked_out_to, assigned_to, checked_out_at, created_at, updated_at, custom_fields, confirmation_status, last_confirmed_at, category:itam_categories(id, name)").eq("is_active", true).eq("is_hidden", false).limit(5000);
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["itam-categories"],
      queryFn: async () => {
        const { data } = await supabase.from("itam_categories").select("*").eq("is_active", true).order("name");
        return data || [];
      },
      ...prefetchOptions,
    });
    queryClient.prefetchQuery({
      queryKey: ["itam-makes"],
      queryFn: async () => {
        const { data } = await supabase.from("itam_makes").select("*").eq("is_active", true).order("name");
        return data || [];
      },
      ...prefetchOptions,
    });
    queryClient.prefetchQuery({
      queryKey: ["users-list"],
      queryFn: async () => {
        const { data } = await supabase.from("users").select("id, name, email, auth_user_id, status, avatar_url, role").eq("status", "active").order("name");
        return data || [];
      },
      ...prefetchOptions,
    });
    queryClient.prefetchQuery({
      queryKey: ["verification-config"],
      queryFn: async () => {
        const { data } = await supabase.from("itam_settings").select("value").eq("key", "verification_config").maybeSingle();
        if (!data?.value) return { verification_period: CONFIRMATION_OVERDUE_DAYS, auto_send_reminders: false, reminder_frequency: 14, include_unassigned: false, notify_on_denial: true, grace_period: 7, excluded_user_ids: [] };
        return { verification_period: CONFIRMATION_OVERDUE_DAYS, auto_send_reminders: false, reminder_frequency: 14, include_unassigned: false, notify_on_denial: true, grace_period: 7, excluded_user_ids: [], ...(data.value as Record<string, unknown>) };
      },
      ...prefetchOptions,
    });
  }, [queryClient]);

  return <ModuleLayout moduleName="Assets" moduleIcon={Package} sidebarItems={assetsSidebarItems} />;
}
