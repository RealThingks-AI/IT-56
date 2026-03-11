
-- IT Tasks table
CREATE TABLE public.it_tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assignee TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  category TEXT NOT NULL DEFAULT 'Other',
  due_date DATE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IT Task Activity Log
CREATE TABLE public.it_task_activity (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES public.it_tasks(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  detail TEXT DEFAULT '',
  user_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.it_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_task_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can do everything (single-tenant)
CREATE POLICY "Authenticated users can read it_tasks"
  ON public.it_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert it_tasks"
  ON public.it_tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update it_tasks"
  ON public.it_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete it_tasks"
  ON public.it_tasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read it_task_activity"
  ON public.it_task_activity FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert it_task_activity"
  ON public.it_task_activity FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_it_tasks_updated_at
  BEFORE UPDATE ON public.it_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
