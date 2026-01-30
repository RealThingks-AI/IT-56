-- Add selected_tools column to profiles table for individual users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS selected_tools text[] DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.profiles.selected_tools IS 'Array of tool keys that the user has selected for their dashboard';