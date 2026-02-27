
-- Create itam_email_config table for persisting email templates and settings
CREATE TABLE public.itam_email_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id bigint DEFAULT 1,
  config_type text NOT NULL, -- 'template' or 'settings'
  config_key text NOT NULL, -- template id (e.g. 'checkout') or 'global_settings'
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, config_type, config_key)
);

-- Enable RLS
ALTER TABLE public.itam_email_config ENABLE ROW LEVEL SECURITY;

-- RLS policy for authenticated users
CREATE POLICY "auth_all" ON public.itam_email_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
