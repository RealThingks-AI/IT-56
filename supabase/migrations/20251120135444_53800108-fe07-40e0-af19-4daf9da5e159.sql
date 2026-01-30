-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  card_last4 TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  stripe_payment_method_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view payment methods in their org"
  ON public.payment_methods
  FOR SELECT
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can insert payment methods in their org"
  ON public.payment_methods
  FOR INSERT
  WITH CHECK (organisation_id = get_user_org());

CREATE POLICY "Users can update payment methods in their org"
  ON public.payment_methods
  FOR UPDATE
  USING (organisation_id = get_user_org());

CREATE POLICY "Users can delete payment methods in their org"
  ON public.payment_methods
  FOR DELETE
  USING (organisation_id = get_user_org());

-- Create index for faster queries
CREATE INDEX idx_payment_methods_org_id ON public.payment_methods(organisation_id);
CREATE INDEX idx_payment_methods_user_id ON public.payment_methods(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();