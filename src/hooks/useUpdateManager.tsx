import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemDevice {
  id: string;
  hostname: string | null;
  ip_address: string | null;
  mac_address: string | null;
  os_name: string | null;
  os_version: string | null;
  os_build: string | null;
  last_seen: string | null;
  last_update_check: string | null;
  update_compliance_status: string | null;
  pending_updates_count: number | null;
  installed_updates_count: number | null;
  device_type: string | null;
  status: string | null;
  assigned_to: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateAlert {
  id: string;
  device_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  is_resolved: boolean;
  created_at: string;
}

export const useUpdateDevices = () => {
  return useQuery({
    queryKey: ["update-devices"],
    queryFn: async () => {
      // Single-company mode: RLS handles access control, no org filter needed
      // @ts-ignore - Bypass deep type inference issue
      const { data, error } = await supabase
        .from("system_devices")
        .select("*")
        .eq("is_active", true)
        .order("hostname");

      if (error) throw error;
      return (data || []) as SystemDevice[];
    },
  });
};

export const useUpdateStats = () => {
  return useQuery({
    queryKey: ["update-stats"],
    queryFn: async () => {
      // Single-company mode: RLS handles access control, no org filter needed
      // @ts-ignore - Bypass deep type inference issue
      const { data: devices } = await supabase
        .from("system_devices")
        .select("id, update_compliance_status, pending_updates_count")
        .eq("is_active", true);

      // @ts-ignore - Bypass deep type inference issue
      const { data: alerts } = await supabase
        .from("system_update_alerts")
        .select("id")
        .eq("is_resolved", false);

      const totalDevices = devices?.length || 0;
      const compliantDevices = (devices || []).filter((d: any) => 
        d.update_compliance_status === "compliant"
      ).length;

      const pendingUpdates = (devices || []).reduce((sum: number, d: any) => 
        sum + (d.pending_updates_count || 0), 0
      );

      const failedUpdates = (devices || []).filter((d: any) => 
        d.update_compliance_status === "failed"
      ).length;

      return {
        totalDevices,
        compliantDevices,
        complianceRate: totalDevices > 0 ? Math.round((compliantDevices / totalDevices) * 100) : 0,
        pendingUpdates,
        failedUpdates,
        unreadAlerts: alerts?.length || 0,
      };
    },
  });
};

export const useUpdateAlerts = () => {
  return useQuery({
    queryKey: ["update-alerts"],
    queryFn: async () => {
      // Single-company mode: RLS handles access control, no org filter needed
      // @ts-ignore - Bypass deep type inference issue
      const { data, error } = await supabase
        .from("system_update_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as UpdateAlert[];
    },
  });
};

export const useMarkAlertResolved = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("system_update_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["update-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["update-stats"] });
      toast.success("Alert marked as resolved");
    },
  });
};
