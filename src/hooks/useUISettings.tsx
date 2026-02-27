import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";

// Types for UI settings
export interface AssetColumnSetting {
  id: string;
  visible: boolean;
}

export interface HelpdeskColumnSetting {
  id: string;
  visible: boolean;
  order: number;
}

export interface DashboardWidgetSetting {
  id: string;
  enabled: boolean;
}

export interface DashboardPreferencesSetting {
  widgets: DashboardWidgetSetting[];
  columns: number;
  showChart: boolean;
  showFeeds: boolean;
  showAlerts: boolean;
  showCalendar: boolean;
  feedFilters?: { newAssets: boolean; checkedOut: boolean; checkedIn: boolean; underRepair: boolean; disposed: boolean };
}

export interface SystemSettingsSetting {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  language: string;
}

export interface CheckoutPreferencesSetting {
  lastAssignee?: string;
}

export interface CheckinPreferencesSetting {
  lastNotes?: string;
}

export interface UISettings {
  assetColumns?: AssetColumnSetting[];
  helpdeskColumns?: HelpdeskColumnSetting[];
  dashboardPreferences?: DashboardPreferencesSetting;
  systemSettings?: SystemSettingsSetting;
  checkoutPreferences?: CheckoutPreferencesSetting;
  checkinPreferences?: CheckinPreferencesSetting;
}

// localStorage keys to migrate
const LOCALSTORAGE_KEYS = {
  assetColumns: "asset-column-settings-v2",
  helpdeskColumns: "helpdesk_column_settings",
  dashboardPreferences: "itam-dashboard-preferences",
  systemSettings: "systemSettings",
};

// Get settings from localStorage for migration
function getLocalStorageSettings(): UISettings {
  const settings: UISettings = {};

  try {
    const assetColumns = localStorage.getItem(LOCALSTORAGE_KEYS.assetColumns);
    if (assetColumns) {
      settings.assetColumns = JSON.parse(assetColumns);
    }
  } catch (e) {
    console.error("Failed to parse assetColumns from localStorage:", e);
  }

  try {
    const helpdeskColumns = localStorage.getItem(LOCALSTORAGE_KEYS.helpdeskColumns);
    if (helpdeskColumns) {
      settings.helpdeskColumns = JSON.parse(helpdeskColumns);
    }
  } catch (e) {
    console.error("Failed to parse helpdeskColumns from localStorage:", e);
  }

  try {
    const dashboardPreferences = localStorage.getItem(LOCALSTORAGE_KEYS.dashboardPreferences);
    if (dashboardPreferences) {
      const parsed = JSON.parse(dashboardPreferences);
      // Extract only serializable data (remove icon references)
      settings.dashboardPreferences = {
        widgets: parsed.widgets?.map((w: any) => ({ id: w.id, enabled: w.enabled })) || [],
        columns: parsed.columns || 4,
        showChart: parsed.showChart ?? true,
        showFeeds: parsed.showFeeds ?? true,
        showAlerts: parsed.showAlerts ?? true,
        showCalendar: parsed.showCalendar ?? true,
      };
    }
  } catch (e) {
    console.error("Failed to parse dashboardPreferences from localStorage:", e);
  }

  try {
    const systemSettings = localStorage.getItem(LOCALSTORAGE_KEYS.systemSettings);
    if (systemSettings) {
      settings.systemSettings = JSON.parse(systemSettings);
    }
  } catch (e) {
    console.error("Failed to parse systemSettings from localStorage:", e);
  }

  return settings;
}

// Clear migrated localStorage keys
function clearMigratedLocalStorage() {
  Object.values(LOCALSTORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

export function useUISettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasMigrated = useRef(false);

  // OPTIMIZED: Single query to get user + preferences in one call
  const { data: userWithSettings, isLoading } = useQuery({
    queryKey: ["user-settings-combined", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Single query: get user + preferences in one call using join
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          preferences:user_preferences(ui_settings)
        `)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Extract the UI settings from the joined result
      const prefs = data?.preferences;
      const uiSettingsData = Array.isArray(prefs)
        ? prefs[0]?.ui_settings
        : prefs?.ui_settings;
      
      return {
        userId: data?.id || null,
        uiSettings: (uiSettingsData as UISettings) || {}
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,   // 5 minutes - settings rarely change
    gcTime: 10 * 60 * 1000,     // 10 minutes cache retention
  });

  // Extract values from combined query result
  const userProfileId = userWithSettings?.userId;
  const uiSettings = userWithSettings?.uiSettings || {};

  // Migrate localStorage to database on first load
  useEffect(() => {
    if (!userProfileId || !uiSettings || hasMigrated.current) return;

    const localSettings = getLocalStorageSettings();
    const hasLocalSettings = Object.keys(localSettings).length > 0;
    const hasDbSettings = Object.keys(uiSettings).length > 0;

    // Only migrate if there are local settings and no DB settings
    if (hasLocalSettings && !hasDbSettings) {
      hasMigrated.current = true;
      
      supabase
        .from("user_preferences")
        .upsert(
          { user_id: userProfileId, ui_settings: localSettings as any },
          { onConflict: "user_id" }
        )
        .then(({ error }) => {
          if (!error) {
            clearMigratedLocalStorage();
            queryClient.invalidateQueries({ queryKey: ["user-settings-combined"] });
            console.log("Successfully migrated UI settings from localStorage to database");
          }
        });
    } else if (hasDbSettings) {
      // Clear local storage if DB has settings (already migrated)
      clearMigratedLocalStorage();
    }
  }, [userProfileId, uiSettings, queryClient]);

  // Update UI settings mutation
  const updateUISettings = useMutation({
    mutationFn: async (newSettings: Partial<UISettings>) => {
      if (!userProfileId) throw new Error("User not found");

      const mergedSettings = { ...uiSettings, ...newSettings };

      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          { user_id: userProfileId, ui_settings: mergedSettings as any },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      return mergedSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings-combined"] });
    },
  });

  // Helper to update specific setting type
  const updateAssetColumns = (columns: AssetColumnSetting[]) => {
    return updateUISettings.mutateAsync({ assetColumns: columns });
  };

  const updateHelpdeskColumns = (columns: HelpdeskColumnSetting[]) => {
    return updateUISettings.mutateAsync({ helpdeskColumns: columns });
  };

  const updateDashboardPreferences = (prefs: DashboardPreferencesSetting) => {
    return updateUISettings.mutateAsync({ dashboardPreferences: prefs });
  };

  const updateSystemSettings = (settings: SystemSettingsSetting) => {
    return updateUISettings.mutateAsync({ systemSettings: settings });
  };

  return {
    uiSettings: uiSettings || {},
    isLoading,
    isAuthenticated: !!user,
    updateUISettings,
    updateAssetColumns,
    updateHelpdeskColumns,
    updateDashboardPreferences,
    updateSystemSettings,
    // Getters for specific settings
    assetColumns: uiSettings?.assetColumns,
    helpdeskColumns: uiSettings?.helpdeskColumns,
    dashboardPreferences: uiSettings?.dashboardPreferences,
    systemSettings: uiSettings?.systemSettings,
  };
}