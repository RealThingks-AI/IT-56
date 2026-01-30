-- Create table for tool-specific inactive notices
CREATE TABLE IF NOT EXISTS public.tool_inactive_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  CONSTRAINT fk_tool FOREIGN KEY (tool_id) REFERENCES public.tools(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.tool_inactive_notices ENABLE ROW LEVEL SECURITY;

-- Create policy for super admins to manage notices
CREATE POLICY "Super admins can manage tool inactive notices"
ON public.tool_inactive_notices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appmaster_admins
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appmaster_admins
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create index for faster lookups
CREATE INDEX idx_tool_inactive_notices_tool_id ON public.tool_inactive_notices(tool_id);
CREATE INDEX idx_tool_inactive_notices_active ON public.tool_inactive_notices(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_tool_inactive_notices_updated_at
  BEFORE UPDATE ON public.tool_inactive_notices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();