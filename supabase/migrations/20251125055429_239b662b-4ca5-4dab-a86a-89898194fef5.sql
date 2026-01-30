-- Create currencies table
CREATE TABLE IF NOT EXISTS public.currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Policies for currencies table
CREATE POLICY "Anyone can view active currencies"
  ON public.currencies
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert currencies"
  ON public.currencies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can update currencies"
  ON public.currencies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'owner')
    )
  );

-- Seed with default currencies
INSERT INTO public.currencies (code, symbol, name) VALUES
  ('INR', '₹', 'Indian Rupee'),
  ('USD', '$', 'US Dollar'),
  ('EUR', '€', 'Euro')
ON CONFLICT (code) DO NOTHING;