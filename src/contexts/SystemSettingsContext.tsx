import React, { createContext, useContext, ReactNode } from 'react';
import { useUISettings, SystemSettingsSetting } from '@/hooks/useUISettings';
import { useSessionStore } from '@/stores/useSessionStore';

interface SystemSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  language: string;
}

interface SystemSettingsContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  isLoading: boolean;
}

const defaultSettings: SystemSettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h',
  currency: 'USD',
  language: 'en',
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider = ({ children }: { children: ReactNode }) => {
  // Read from session store first (populated by bootstrap_session)
  const storeUiSettings = useSessionStore((s) => s.uiSettings);
  const storeStatus = useSessionStore((s) => s.status);

  const { systemSettings, isLoading: hookLoading, isAuthenticated, updateSystemSettings } = useUISettings();

  // Use store settings if available (instant), fall back to hook query
  const resolvedSettings = storeStatus === 'ready' && storeUiSettings?.systemSettings
    ? storeUiSettings.systemSettings as SystemSettings
    : systemSettings;

  const isLoading = storeStatus === 'ready' ? false : hookLoading;

  // Merge database settings with defaults
  const settings: SystemSettings = {
    ...defaultSettings,
    ...(resolvedSettings || {}),
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (isAuthenticated) {
      try {
        const merged: SystemSettingsSetting = { ...settings, ...newSettings };
        await updateSystemSettings(merged);
      } catch (error) {
        console.error('Failed to update system settings:', error);
      }
    }
  };

  return (
    <SystemSettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
};
