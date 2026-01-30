-- Add pricing columns to tools table
ALTER TABLE public.tools
ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS yearly_price NUMERIC(10, 2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.tools.monthly_price IS 'Monthly subscription price for this tool in INR';
COMMENT ON COLUMN public.tools.yearly_price IS 'Yearly subscription price for this tool in INR';