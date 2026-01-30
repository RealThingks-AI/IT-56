-- Add heartbeat and task management tables for device agent

-- Device heartbeat tracking
CREATE TABLE IF NOT EXISTS public.device_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.system_devices(id) ON DELETE CASCADE,
  tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'online',
  agent_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Device tasks/jobs queue
CREATE TABLE IF NOT EXISTS public.device_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.system_devices(id) ON DELETE CASCADE,
  tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- 'install_update', 'restart', 'run_script', 'collect_logs', etc.
  task_payload JSONB,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.device_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_heartbeats
CREATE POLICY "Users can view heartbeats in their tenant"
  ON public.device_heartbeats FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::integer);

CREATE POLICY "System can insert heartbeats"
  ON public.device_heartbeats FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::integer);

-- RLS Policies for device_tasks
CREATE POLICY "Users can view tasks in their tenant"
  ON public.device_tasks FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::integer);

CREATE POLICY "Users can insert tasks in their tenant"
  ON public.device_tasks FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::integer);

CREATE POLICY "Users can update tasks in their tenant"
  ON public.device_tasks FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::integer);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_heartbeats_device_id ON public.device_heartbeats(device_id);
CREATE INDEX IF NOT EXISTS idx_device_heartbeats_tenant ON public.device_heartbeats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_heartbeats_time ON public.device_heartbeats(heartbeat_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_tasks_device_id ON public.device_tasks(device_id);
CREATE INDEX IF NOT EXISTS idx_device_tasks_tenant ON public.device_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_tasks_status ON public.device_tasks(status);
CREATE INDEX IF NOT EXISTS idx_device_tasks_created ON public.device_tasks(created_at DESC);