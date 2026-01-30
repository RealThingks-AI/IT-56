-- Create update_devices table to sync assets for update tracking
CREATE TABLE public.update_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  asset_id BIGINT NOT NULL,
  asset_tag TEXT,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('laptop', 'desktop', 'server')),
  os_name TEXT,
  os_version TEXT,
  owner_id UUID,
  owner_name TEXT,
  location TEXT,
  department TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  last_update_check TIMESTAMPTZ,
  update_status TEXT DEFAULT 'unknown' CHECK (update_status IN ('unknown', 'up_to_date', 'pending', 'installing', 'reboot_required', 'failed')),
  pending_updates_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create update_completions for manual monthly completions
CREATE TABLE public.update_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  device_id UUID NOT NULL REFERENCES public.update_devices(id) ON DELETE CASCADE,
  completion_month DATE NOT NULL, -- First day of the month
  completed_by UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  is_manual BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create update_rollout_jobs for scheduled rollouts
CREATE TABLE public.update_rollout_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  job_type TEXT DEFAULT 'standard' CHECK (job_type IN ('standard', 'staged', 'emergency')),
  target_type TEXT DEFAULT 'all' CHECK (target_type IN ('all', 'selected', 'group', 'department', 'location')),
  target_filter JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  maintenance_window_start TIME,
  maintenance_window_end TIME,
  auto_reboot BOOLEAN DEFAULT false,
  max_retries INTEGER DEFAULT 3,
  rollback_on_failure BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create update_job_devices for tracking job progress per device
CREATE TABLE public.update_job_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  job_id UUID NOT NULL REFERENCES public.update_rollout_jobs(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.update_devices(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'installing', 'completed', 'failed', 'skipped', 'rolled_back')),
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  logs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create update_alerts for notifications
CREATE TABLE public.update_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  device_id UUID REFERENCES public.update_devices(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.update_rollout_jobs(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('failure', 'reboot_required', 'overdue', 'job_completed', 'critical_update')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  read_by UUID,
  read_at TIMESTAMPTZ,
  ticket_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.update_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_rollout_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_job_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for update_devices
CREATE POLICY "tenant_select_update_devices" ON public.update_devices FOR SELECT
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_insert_update_devices" ON public.update_devices FOR INSERT
  WITH CHECK ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_update_update_devices" ON public.update_devices FOR UPDATE
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_delete_update_devices" ON public.update_devices FOR DELETE
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

-- RLS Policies for update_completions
CREATE POLICY "tenant_select_update_completions" ON public.update_completions FOR SELECT
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_insert_update_completions" ON public.update_completions FOR INSERT
  WITH CHECK ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_delete_update_completions" ON public.update_completions FOR DELETE
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

-- RLS Policies for update_rollout_jobs
CREATE POLICY "tenant_select_update_rollout_jobs" ON public.update_rollout_jobs FOR SELECT
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_insert_update_rollout_jobs" ON public.update_rollout_jobs FOR INSERT
  WITH CHECK ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_update_update_rollout_jobs" ON public.update_rollout_jobs FOR UPDATE
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_delete_update_rollout_jobs" ON public.update_rollout_jobs FOR DELETE
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

-- RLS Policies for update_job_devices
CREATE POLICY "tenant_select_update_job_devices" ON public.update_job_devices FOR SELECT
  USING (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "tenant_insert_update_job_devices" ON public.update_job_devices FOR INSERT
  WITH CHECK (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "tenant_update_update_job_devices" ON public.update_job_devices FOR UPDATE
  USING (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for update_alerts
CREATE POLICY "tenant_select_update_alerts" ON public.update_alerts FOR SELECT
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_insert_update_alerts" ON public.update_alerts FOR INSERT
  WITH CHECK ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "tenant_update_update_alerts" ON public.update_alerts FOR UPDATE
  USING ((organisation_id = get_user_org()) OR (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

-- Create indexes for performance
CREATE INDEX idx_update_devices_tenant ON public.update_devices(tenant_id);
CREATE INDEX idx_update_devices_asset ON public.update_devices(asset_id);
CREATE INDEX idx_update_devices_status ON public.update_devices(update_status);
CREATE INDEX idx_update_completions_device ON public.update_completions(device_id);
CREATE INDEX idx_update_completions_month ON public.update_completions(completion_month);
CREATE INDEX idx_update_rollout_jobs_status ON public.update_rollout_jobs(status);
CREATE INDEX idx_update_job_devices_job ON public.update_job_devices(job_id);
CREATE INDEX idx_update_alerts_device ON public.update_alerts(device_id);