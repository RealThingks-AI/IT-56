import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CONFIRMATION_OVERDUE_DAYS } from "@/lib/assets/assetStatusUtils";

export interface VerificationConfig {
  verification_period: number;
  auto_send_reminders: boolean;
  reminder_frequency: number;
  include_unassigned: boolean;
  notify_on_denial: boolean;
  grace_period: number;
  excluded_user_ids: string[];
}

const DEFAULTS: VerificationConfig = {
  verification_period: CONFIRMATION_OVERDUE_DAYS,
  auto_send_reminders: false,
  reminder_frequency: 14,
  include_unassigned: false,
  notify_on_denial: true,
  grace_period: 7,
  excluded_user_ids: [],
};

export function useVerificationConfig() {
  const queryClient = useQueryClient();

  const { data: config = DEFAULTS, isLoading } = useQuery({
    queryKey: ["verification-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_settings")
        .select("value")
        .eq("key", "verification_config")
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return DEFAULTS;
      const val = data.value as Record<string, unknown>;
      return { ...DEFAULTS, ...val } as VerificationConfig;
    },
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (newConfig: VerificationConfig) => {
      // Try update first, then insert
      const { data: existing } = await supabase
        .from("itam_settings")
        .select("id")
        .eq("key", "verification_config")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("itam_settings")
          .update({ value: newConfig as any, updated_at: new Date().toISOString() })
          .eq("key", "verification_config");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("itam_settings")
          .insert({ key: "verification_config", value: newConfig as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-config"] });
    },
  });

  return {
    config,
    isLoading,
    saveConfig: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
