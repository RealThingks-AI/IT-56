-- =============================================
-- System Updates / Device Management Tables
-- =============================================

-- System devices table (devices being monitored for updates)
CREATE TABLE IF NOT EXISTS public.system_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hostname TEXT NOT NULL,
  ip_address TEXT,
  mac_address TEXT,
  os_name TEXT,
  os_version TEXT,
  os_build TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_update_check TIMESTAMP WITH TIME ZONE,
  update_compliance_status TEXT DEFAULT 'unknown' CHECK (update_compliance_status IN ('compliant', 'non_compliant', 'unknown', 'pending')),
  pending_updates_count INTEGER DEFAULT 0,
  installed_updates_count INTEGER DEFAULT 0,
  device_type TEXT DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'laptop', 'server', 'virtual')),
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance', 'retired')),
  assigned_to UUID,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.system_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_system_devices" ON public.system_devices
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- System updates catalog
CREATE TABLE IF NOT EXISTS public.system_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kb_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'security' CHECK (category IN ('security', 'critical', 'feature', 'driver', 'cumulative', 'other')),
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('critical', 'important', 'moderate', 'low')),
  release_date DATE,
  size_bytes BIGINT,
  download_url TEXT,
  is_superseded BOOLEAN DEFAULT false,
  superseded_by TEXT,
  applies_to JSONB DEFAULT '[]',
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_system_updates" ON public.system_updates
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Pending updates per device
CREATE TABLE IF NOT EXISTS public.system_pending_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.system_devices(id) ON DELETE CASCADE,
  update_id UUID REFERENCES public.system_updates(id),
  kb_number TEXT,
  title TEXT,
  severity TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'ready', 'installing', 'failed', 'deferred')),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.system_pending_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_system_pending_updates" ON public.system_pending_updates
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Installed updates per device
CREATE TABLE IF NOT EXISTS public.system_installed_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.system_devices(id) ON DELETE CASCADE,
  update_id UUID REFERENCES public.system_updates(id),
  kb_number TEXT,
  title TEXT,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  installed_by TEXT,
  result TEXT DEFAULT 'success' CHECK (result IN ('success', 'partial', 'failed', 'pending_reboot')),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.system_installed_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_system_installed_updates" ON public.system_installed_updates
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Update history/audit trail
CREATE TABLE IF NOT EXISTS public.system_update_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.system_devices(id) ON DELETE SET NULL,
  update_id UUID REFERENCES public.system_updates(id),
  action TEXT NOT NULL,
  details JSONB,
  performed_by UUID,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.system_update_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_system_update_history" ON public.system_update_history
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Update alerts
CREATE TABLE IF NOT EXISTS public.system_update_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.system_devices(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.system_update_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_system_update_alerts" ON public.system_update_alerts
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Ingest logs (for device agent data ingestion)
CREATE TABLE IF NOT EXISTS public.system_update_ingest_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.system_devices(id) ON DELETE SET NULL,
  hostname TEXT,
  ingested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  pending_count INTEGER DEFAULT 0,
  installed_count INTEGER DEFAULT 0,
  error_message TEXT,
  raw_data JSONB,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.system_update_ingest_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_system_update_ingest_logs" ON public.system_update_ingest_logs
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- System settings for update management
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB,
  description TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE UNIQUE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(key, organisation_id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_system_settings" ON public.system_settings
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Update devices table (for rollout jobs)
CREATE TABLE IF NOT EXISTS public.update_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT NOT NULL,
  device_type TEXT,
  os_version TEXT,
  last_update TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'up_to_date',
  is_active BOOLEAN DEFAULT true,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.update_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_update_devices" ON public.update_devices
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Update completions tracking
CREATE TABLE IF NOT EXISTS public.update_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.update_devices(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_by UUID,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(device_id, month)
);

ALTER TABLE public.update_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_update_completions" ON public.update_completions
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Update rollout jobs
CREATE TABLE IF NOT EXISTS public.update_rollout_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  description TEXT,
  target_devices JSONB DEFAULT '[]',
  target_groups JSONB DEFAULT '[]',
  updates JSONB DEFAULT '[]',
  schedule_type TEXT DEFAULT 'immediate' CHECK (schedule_type IN ('immediate', 'scheduled', 'maintenance_window')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  progress_percent INTEGER DEFAULT 0,
  devices_total INTEGER DEFAULT 0,
  devices_completed INTEGER DEFAULT 0,
  devices_failed INTEGER DEFAULT 0,
  created_by UUID,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.update_rollout_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_update_rollout_jobs" ON public.update_rollout_jobs
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Update job devices (tracks individual device status in a rollout)
CREATE TABLE IF NOT EXISTS public.update_job_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.update_rollout_jobs(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.update_devices(id) ON DELETE SET NULL,
  device_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.update_job_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_update_job_devices" ON public.update_job_devices
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Update alerts
CREATE TABLE IF NOT EXISTS public.update_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT,
  device_id UUID REFERENCES public.update_devices(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.update_rollout_jobs(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.update_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_update_alerts" ON public.update_alerts
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_devices_org ON public.system_devices(organisation_id);
CREATE INDEX IF NOT EXISTS idx_system_devices_status ON public.system_devices(status);
CREATE INDEX IF NOT EXISTS idx_system_pending_updates_device ON public.system_pending_updates(device_id);
CREATE INDEX IF NOT EXISTS idx_system_installed_updates_device ON public.system_installed_updates(device_id);
CREATE INDEX IF NOT EXISTS idx_update_rollout_jobs_status ON public.update_rollout_jobs(status);
CREATE INDEX IF NOT EXISTS idx_update_job_devices_job ON public.update_job_devices(job_id);