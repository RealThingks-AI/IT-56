-- Add created_by column to broadcasts table
ALTER TABLE public.broadcasts
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Add index for created_by
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON public.broadcasts(created_by);