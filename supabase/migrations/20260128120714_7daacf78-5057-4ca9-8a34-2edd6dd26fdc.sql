-- Create category_tag_formats table for storing prefix configurations per category
CREATE TABLE IF NOT EXISTS public.category_tag_formats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.itam_categories(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  current_number INTEGER DEFAULT 1,
  zero_padding INTEGER DEFAULT 4,
  organisation_id UUID REFERENCES public.organisations(id),
  tenant_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(category_id, organisation_id)
);

-- Enable RLS
ALTER TABLE public.category_tag_formats ENABLE ROW LEVEL SECURITY;

-- RLS policy for viewing tag formats
CREATE POLICY "Users can view their org tag formats"
  ON public.category_tag_formats FOR SELECT
  USING (organisation_id = auth_organisation_id());

-- RLS policy for inserting tag formats
CREATE POLICY "Users can insert their org tag formats"
  ON public.category_tag_formats FOR INSERT
  WITH CHECK (organisation_id = auth_organisation_id());

-- RLS policy for updating tag formats
CREATE POLICY "Users can update their org tag formats"
  ON public.category_tag_formats FOR UPDATE
  USING (organisation_id = auth_organisation_id());

-- RLS policy for deleting tag formats
CREATE POLICY "Users can delete their org tag formats"
  ON public.category_tag_formats FOR DELETE
  USING (organisation_id = auth_organisation_id());

-- Create updated_at trigger
CREATE TRIGGER update_category_tag_formats_updated_at
  BEFORE UPDATE ON public.category_tag_formats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();