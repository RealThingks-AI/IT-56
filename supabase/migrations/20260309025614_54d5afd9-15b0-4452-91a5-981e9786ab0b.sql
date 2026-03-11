
-- Phase 1: Create onboarding/offboarding tables

-- Templates table
CREATE TABLE public.ob_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'onboarding' CHECK (type IN ('onboarding', 'offboarding')),
  description text DEFAULT '',
  default_tasks jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workflows table
CREATE TABLE public.ob_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'onboarding' CHECK (type IN ('onboarding', 'offboarding')),
  employee_name text NOT NULL,
  employee_email text DEFAULT '',
  department text DEFAULT '',
  template_id uuid REFERENCES public.ob_templates(id) ON DELETE SET NULL,
  start_date date,
  last_day date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  assigned_to text DEFAULT 'Unassigned',
  reason text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workflow tasks table
CREATE TABLE public.ob_workflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.ob_workflows(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  is_completed boolean NOT NULL DEFAULT false,
  assigned_to text DEFAULT '',
  due_date date,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ob_workflows_status ON public.ob_workflows(status);
CREATE INDEX idx_ob_workflows_type ON public.ob_workflows(type);
CREATE INDEX idx_ob_workflow_tasks_workflow ON public.ob_workflow_tasks(workflow_id);

-- Updated_at triggers
CREATE TRIGGER update_ob_templates_updated_at BEFORE UPDATE ON public.ob_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ob_workflows_updated_at BEFORE UPDATE ON public.ob_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.ob_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ob_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ob_workflow_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ob_templates" ON public.ob_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ob_templates" ON public.ob_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ob_templates" ON public.ob_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete ob_templates" ON public.ob_templates FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read ob_workflows" ON public.ob_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ob_workflows" ON public.ob_workflows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ob_workflows" ON public.ob_workflows FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete ob_workflows" ON public.ob_workflows FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read ob_workflow_tasks" ON public.ob_workflow_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ob_workflow_tasks" ON public.ob_workflow_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ob_workflow_tasks" ON public.ob_workflow_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete ob_workflow_tasks" ON public.ob_workflow_tasks FOR DELETE TO authenticated USING (true);
