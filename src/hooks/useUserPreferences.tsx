import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/stores/useSessionStore";
import { toast } from "sonner";

export interface UserPreferences {
  id?: string;
  user_id: string;
  currency: string;
  date_format: string;
  time_format: string;
  timezone: string | null;
  email_notifications: boolean;
  in_app_notifications: boolean;
  notification_settings: Record<string, any>;
  last_password_change: string | null;
}

const defaultPreferences: Omit<UserPreferences, "user_id"> = {
  currency: "USD",
  date_format: "MM/DD/YYYY",
  time_format: "12h",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  email_notifications: true,
  in_app_notifications: true,
  notification_settings: {
    deliveryFrequency: "instant",
    moduleNotifications: {
      tickets: true,
      assets: true,
      systemUpdates: true,
      subscriptions: true,
      monitoring: true,
    },
    eventTriggers: {
      ticketAssigned: true,
      ticketUpdated: true,
      slaBreaching: true,
      assetExpiring: true,
      weeklyDigest: false,
    },
  },
  last_password_change: null,
};

export function useUserPreferences() {
  const queryClient = useQueryClient();
  // Use session store's internal user ID directly — no waterfall query
  const internalUserId = useSessionStore((s) => s.internalUserId);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["user-preferences", internalUserId],
    queryFn: async () => {
      if (!internalUserId) return null;
      
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", internalUserId)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no preferences exist, return defaults with user_id
      if (!data) {
        return { ...defaultPreferences, user_id: internalUserId } as UserPreferences;
      }
      
      return data as UserPreferences;
    },
    enabled: !!internalUserId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const updatePreferences = useMutation({
    mutationFn: async (newPrefs: Partial<UserPreferences>) => {
      if (!internalUserId) throw new Error("User not found");

      const dataToUpsert = {
        user_id: internalUserId,
        ...newPrefs,
      };

      const { error } = await supabase
        .from("user_preferences")
        .upsert(dataToUpsert, { onConflict: "user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to save preferences: " + error.message);
    },
  });

  const updateLastPasswordChange = useMutation({
    mutationFn: async () => {
      if (!internalUserId) throw new Error("User not found");

      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          { user_id: internalUserId, last_password_change: new Date().toISOString() },
          { onConflict: "user_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    },
  });

  return {
    preferences: preferences || { ...defaultPreferences, user_id: internalUserId || "" },
    isLoading,
    updatePreferences,
    updateLastPasswordChange,
  };
}
