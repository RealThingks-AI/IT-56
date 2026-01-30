-- =============================================
-- Monitoring Tables
-- =============================================

-- Monitors table
CREATE TABLE IF NOT EXISTS public.monitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'ping' CHECK (type IN ('ping', 'http', 'port', 'heartbeat', 'keyword')),
  target TEXT NOT NULL,
  interval_seconds INTEGER DEFAULT 300,
  timeout_seconds INTEGER DEFAULT 30,
  expected_status_code INTEGER DEFAULT 200,
  keyword TEXT,
  is_active BOOLEAN DEFAULT true,
  last_check TIMESTAMP WITH TIME ZONE,
  last_status TEXT DEFAULT 'unknown' CHECK (last_status IN ('up', 'down', 'degraded', 'unknown')),
  uptime_percent DECIMAL(5,2) DEFAULT 100.00,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_monitors" ON public.monitors
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Monitor data (check results)
CREATE TABLE IF NOT EXISTS public.monitor_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID NOT NULL REFERENCES public.monitors(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('up', 'down', 'degraded')),
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id)
);

ALTER TABLE public.monitor_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_monitor_data" ON public.monitor_data
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Monitoring alerts
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID REFERENCES public.monitors(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_monitoring_alerts" ON public.monitoring_alerts
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Monitoring incidents
CREATE TABLE IF NOT EXISTS public.monitoring_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID REFERENCES public.monitors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity TEXT DEFAULT 'major' CHECK (severity IN ('minor', 'major', 'critical')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  root_cause TEXT,
  resolution TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  tenant_id BIGINT REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.monitoring_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_monitoring_incidents" ON public.monitoring_incidents
  FOR ALL USING (
    organisation_id = get_user_org() 
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_monitors_org ON public.monitors(organisation_id);
CREATE INDEX IF NOT EXISTS idx_monitor_data_monitor ON public.monitor_data(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_monitor ON public.monitoring_alerts(monitor_id);