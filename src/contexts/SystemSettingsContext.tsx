import React, { createContext, useContext, ReactNode } from 'react';
import { useUISettings, SystemSettingsSetting } from '@/hooks/useUISettings';

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
  const { systemSettings, isLoading, isAuthenticated, updateSystemSettings } = useUISettings();

  // Merge database settings with defaults
  const settings: SystemSettings = {
    ...defaultSettings,
    ...(systemSettings || {}),
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
