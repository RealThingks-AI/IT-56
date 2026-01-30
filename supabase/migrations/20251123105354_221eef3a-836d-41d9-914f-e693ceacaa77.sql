-- Create monitors table for tracking monitored resources
CREATE TABLE IF NOT EXISTS public.monitors (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('server', 'database', 'application', 'network', 'service')),
  endpoint TEXT,
  check_interval INTEGER DEFAULT 60,
  timeout INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  configuration JSONB,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create monitor_data table for storing metric data
CREATE TABLE IF NOT EXISTS public.monitor_data (
  id BIGSERIAL PRIMARY KEY,
  monitor_id BIGINT NOT NULL REFERENCES public.monitors(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  response_time INTEGER,
  cpu_usage NUMERIC(5,2),
  memory_usage NUMERIC(5,2),
  disk_usage NUMERIC(5,2),
  error_message TEXT,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Create services table for service monitoring
CREATE TABLE IF NOT EXISTS public.services (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  status TEXT DEFAULT 'unknown' CHECK (status IN ('operational', 'degraded', 'outage', 'maintenance', 'unknown')),
  uptime_percentage NUMERIC(5,2),
  last_check TIMESTAMPTZ,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create service_health table for service health history
CREATE TABLE IF NOT EXISTS public.service_health (
  id BIGSERIAL PRIMARY KEY,
  service_id BIGINT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  response_time INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- Create monitoring_alerts table
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id BIGSERIAL PRIMARY KEY,
  monitor_id BIGINT REFERENCES public.monitors(id) ON DELETE CASCADE,
  service_id BIGINT REFERENCES public.services(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  condition TEXT NOT NULL,
  threshold NUMERIC,
  is_active BOOLEAN DEFAULT true,
  notification_channels JSONB,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create monitoring_incidents table
CREATE TABLE IF NOT EXISTS public.monitoring_incidents (
  id BIGSERIAL PRIMARY KEY,
  incident_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  monitor_id BIGINT REFERENCES public.monitors(id),
  service_id BIGINT REFERENCES public.services(id),
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  assigned_to UUID,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id),
  organisation_id UUID REFERENCES public.organisations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitors
CREATE POLICY "Users can view monitors in their tenant"
  ON public.monitors FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create monitors in their tenant"
  ON public.monitors FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update monitors in their tenant"
  ON public.monitors FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for monitor_data
CREATE POLICY "Users can view monitor data in their tenant"
  ON public.monitor_data FOR SELECT
  USING (
    monitor_id IN (
      SELECT id FROM public.monitors WHERE tenant_id IN (
        SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
        UNION
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for services
CREATE POLICY "Users can view services in their tenant"
  ON public.services FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage services in their tenant"
  ON public.services FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for service_health
CREATE POLICY "Users can view service health in their tenant"
  ON public.service_health FOR SELECT
  USING (
    service_id IN (
      SELECT id FROM public.services WHERE tenant_id IN (
        SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
        UNION
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for monitoring_alerts
CREATE POLICY "Users can manage alerts in their tenant"
  ON public.monitoring_alerts FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for monitoring_incidents
CREATE POLICY "Users can manage incidents in their tenant"
  ON public.monitoring_incidents FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
      UNION
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_monitors_tenant ON public.monitors(tenant_id);
CREATE INDEX idx_monitors_type ON public.monitors(type);
CREATE INDEX idx_monitor_data_monitor ON public.monitor_data(monitor_id);
CREATE INDEX idx_monitor_data_recorded ON public.monitor_data(recorded_at DESC);
CREATE INDEX idx_services_tenant ON public.services(tenant_id);
CREATE INDEX idx_service_health_service ON public.service_health(service_id);
CREATE INDEX idx_monitoring_alerts_tenant ON public.monitoring_alerts(tenant_id);
CREATE INDEX idx_monitoring_incidents_tenant ON public.monitoring_incidents(tenant_id);
CREATE INDEX idx_monitoring_incidents_status ON public.monitoring_incidents(status);