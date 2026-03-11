import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/stores/useSessionStore";
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

export interface AssetListPreferences {
  pageSize?: number;
  sortColumn?: string;
  sortDirection?: string;
}

export interface UISettings {
  assetColumns?: AssetColumnSetting[];
  helpdeskColumns?: HelpdeskColumnSetting[];
  dashboardPreferences?: DashboardPreferencesSetting;
  systemSettings?: SystemSettingsSetting;
  assetColumnWidths?: Record<string, number>;
  assetListPreferences?: AssetListPreferences;
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
    if (assetColumns) settings.assetColumns = JSON.parse(assetColumns);
  } catch (e) { console.error("Failed to parse assetColumns from localStorage:", e); }

  try {
    const helpdeskColumns = localStorage.getItem(LOCALSTORAGE_KEYS.helpdeskColumns);
    if (helpdeskColumns) settings.helpdeskColumns = JSON.parse(helpdeskColumns);
  } catch (e) { console.error("Failed to parse helpdeskColumns from localStorage:", e); }

  try {
    const dashboardPreferences = localStorage.getItem(LOCALSTORAGE_KEYS.dashboardPreferences);
    if (dashboardPreferences) {
      const parsed = JSON.parse(dashboardPreferences);
      settings.dashboardPreferences = {
        widgets: parsed.widgets?.map((w: any) => ({ id: w.id, enabled: w.enabled })) || [],
        columns: parsed.columns || 4,
        showChart: parsed.showChart ?? true,
        showFeeds: parsed.showFeeds ?? true,
        showAlerts: parsed.showAlerts ?? true,
        showCalendar: parsed.showCalendar ?? true,
      };
    }
  } catch (e) { console.error("Failed to parse dashboardPreferences from localStorage:", e); }

  try {
    const systemSettings = localStorage.getItem(LOCALSTORAGE_KEYS.systemSettings);
    if (systemSettings) settings.systemSettings = JSON.parse(systemSettings);
  } catch (e) { console.error("Failed to parse systemSettings from localStorage:", e); }

  return settings;
}

// Clear migrated localStorage keys
function clearMigratedLocalStorage() {
  Object.values(LOCALSTORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

export function useUISettings() {
  const queryClient = useQueryClient();
  const hasMigrated = useRef(false);
  // Use session store's internal user ID — no waterfall
  const internalUserId = useSessionStore((s) => s.internalUserId);
  const isAuthenticated = useSessionStore((s) => s.status === "ready");

  const { data: uiSettings = {} as UISettings, isLoading } = useQuery({
    queryKey: ["user-ui-settings", internalUserId],
    queryFn: async () => {
      if (!internalUserId) return {} as UISettings;

      const { data, error } = await supabase
        .from("user_preferences")
        .select("ui_settings")
        .eq("user_id", internalUserId)
        .maybeSingle();

      if (error) throw error;
      return (data?.ui_settings as UISettings) || {};
    },
    enabled: !!internalUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });

  // Migrate localStorage to database on first load
  useEffect(() => {
    if (!internalUserId || !uiSettings || hasMigrated.current) return;

    const localSettings = getLocalStorageSettings();
    const hasLocalSettings = Object.keys(localSettings).length > 0;
    const hasDbSettings = Object.keys(uiSettings).length > 0;

    if (hasLocalSettings && !hasDbSettings) {
      hasMigrated.current = true;
      
      supabase
        .from("user_preferences")
        .upsert(
          { user_id: internalUserId, ui_settings: localSettings as any },
          { onConflict: "user_id" }
        )
        .then(({ error }) => {
          if (!error) {
            clearMigratedLocalStorage();
            queryClient.invalidateQueries({ queryKey: ["user-ui-settings"] });
            // Migration complete
          }
        });
    } else if (hasDbSettings) {
      clearMigratedLocalStorage();
    }
  }, [internalUserId, uiSettings, queryClient]);

  // Update UI settings mutation
  const updateUISettings = useMutation({
    mutationFn: async (newSettings: Partial<UISettings>) => {
      if (!internalUserId) throw new Error("User not found");

      const mergedSettings = { ...uiSettings, ...newSettings };

      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          { user_id: internalUserId, ui_settings: mergedSettings as any },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      return mergedSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-ui-settings"] });
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
    isAuthenticated,
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
