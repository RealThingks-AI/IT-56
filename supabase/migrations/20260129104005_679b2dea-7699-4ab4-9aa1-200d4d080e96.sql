-- Add ui_settings column to user_preferences table for UI-specific settings
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS ui_settings jsonb DEFAULT '{}';

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.user_preferences.ui_settings IS 
'Stores user-specific UI settings like column visibility, dashboard preferences. Structure: { assetColumns: [...], helpdeskColumns: [...], dashboardPreferences: {...}, systemSettings: {...} }';