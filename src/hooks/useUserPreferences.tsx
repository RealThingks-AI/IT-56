import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's internal ID
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-for-prefs", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["user-preferences", userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) return null;
      
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userProfile.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no preferences exist, return defaults with user_id
      if (!data) {
        return { ...defaultPreferences, user_id: userProfile.id } as UserPreferences;
      }
      
      return data as UserPreferences;
    },
    enabled: !!userProfile?.id,
  });

  const updatePreferences = useMutation({
    mutationFn: async (newPrefs: Partial<UserPreferences>) => {
      if (!userProfile?.id) throw new Error("User not found");

      const dataToUpsert = {
        user_id: userProfile.id,
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
      if (!userProfile?.id) throw new Error("User not found");

      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          { user_id: userProfile.id, last_password_change: new Date().toISOString() },
          { onConflict: "user_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    },
  });

  return {
    preferences: preferences || { ...defaultPreferences, user_id: userProfile?.id || "" },
    isLoading,
    updatePreferences,
    updateLastPasswordChange,
  };
}
