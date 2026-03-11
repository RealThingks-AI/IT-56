
-- Asset confirmation tracking tables
CREATE TABLE public.itam_asset_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  requested_by uuid REFERENCES public.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.itam_asset_confirmation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_id uuid NOT NULL REFERENCES public.itam_asset_confirmations(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL,
  asset_tag text,
  asset_name text,
  response text,
  responded_at timestamptz,
  deny_reason text
);

-- Add confirmation tracking columns to itam_assets
ALTER TABLE public.itam_assets ADD COLUMN IF NOT EXISTS last_confirmed_at timestamptz;
ALTER TABLE public.itam_assets ADD COLUMN IF NOT EXISTS confirmation_status text DEFAULT 'unconfirmed';

-- RLS
ALTER TABLE public.itam_asset_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itam_asset_confirmation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage confirmations" ON public.itam_asset_confirmations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage confirmation items" ON public.itam_asset_confirmation_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anon access for token-based public confirmation (edge function uses service role, but just in case)
CREATE POLICY "Anon can read confirmations by token" ON public.itam_asset_confirmations
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read confirmation items" ON public.itam_asset_confirmation_items
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update confirmation items" ON public.itam_asset_confirmation_items
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
