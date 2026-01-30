-- Create system_settings table for storing global application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can manage all system settings
CREATE POLICY "Super admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Insert default system settings
INSERT INTO public.system_settings (key, value) VALUES
  ('app_name', 'AppMaster'),
  ('support_email', 'support@appmaster.com'),
  ('timezone', 'UTC'),
  ('maintenance_mode', 'false'),
  ('min_password_length', '8'),
  ('require_special_char', 'true'),
  ('require_2fa', 'false'),
  ('session_timeout', '30'),
  ('max_login_attempts', '5'),
  ('email_notifications', 'true'),
  ('system_alerts', 'true'),
  ('user_activity_alerts', 'false'),
  ('security_alerts', 'true')
ON CONFLICT (key) DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();