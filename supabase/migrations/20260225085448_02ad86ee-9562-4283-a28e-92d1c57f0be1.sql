-- Create depreciation profiles table
CREATE TABLE public.itam_depreciation_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'straight_line' CHECK (method IN ('straight_line', 'declining_balance', 'sum_of_years')),
  useful_life_years INTEGER NOT NULL DEFAULT 5,
  salvage_value_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  category_id UUID REFERENCES public.itam_categories(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.itam_depreciation_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage depreciation profiles"
  ON public.itam_depreciation_profiles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
