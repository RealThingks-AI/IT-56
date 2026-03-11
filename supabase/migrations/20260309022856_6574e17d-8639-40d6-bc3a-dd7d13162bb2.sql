
-- it_task_comments table
CREATE TABLE public.it_task_comments (
  id serial PRIMARY KEY,
  task_id integer NOT NULL REFERENCES public.it_tasks(id) ON DELETE CASCADE,
  comment text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- it_task_attachments table
CREATE TABLE public.it_task_attachments (
  id serial PRIMARY KEY,
  task_id integer NOT NULL REFERENCES public.it_tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  uploaded_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on comments
ALTER TABLE public.it_task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select it_task_comments" ON public.it_task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert it_task_comments" ON public.it_task_comments FOR INSERT TO authenticated WITH CHECK (true);

-- RLS on attachments
ALTER TABLE public.it_task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select it_task_attachments" ON public.it_task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert it_task_attachments" ON public.it_task_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete it_task_attachments" ON public.it_task_attachments FOR DELETE TO authenticated USING (true);

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('it-task-attachments', 'it-task-attachments', true);

-- Storage policies
CREATE POLICY "Authenticated can upload it-task-attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'it-task-attachments');
CREATE POLICY "Anyone can view it-task-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'it-task-attachments');
CREATE POLICY "Authenticated can delete it-task-attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'it-task-attachments');
