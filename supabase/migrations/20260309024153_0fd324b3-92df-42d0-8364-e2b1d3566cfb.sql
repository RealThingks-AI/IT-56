
-- Drop existing FK constraints and re-add with ON DELETE CASCADE
ALTER TABLE IF EXISTS public.it_task_comments
  DROP CONSTRAINT IF EXISTS it_task_comments_task_id_fkey;
ALTER TABLE IF EXISTS public.it_task_comments
  ADD CONSTRAINT it_task_comments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.it_tasks(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.it_task_attachments
  DROP CONSTRAINT IF EXISTS it_task_attachments_task_id_fkey;
ALTER TABLE IF EXISTS public.it_task_attachments
  ADD CONSTRAINT it_task_attachments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.it_tasks(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.it_task_activity
  DROP CONSTRAINT IF EXISTS it_task_activity_task_id_fkey;
ALTER TABLE IF EXISTS public.it_task_activity
  ADD CONSTRAINT it_task_activity_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.it_tasks(id) ON DELETE CASCADE;
