-- Create table for issue reports
CREATE TABLE IF NOT EXISTS public.issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reports
CREATE POLICY "Users can view their own issue reports"
  ON public.issue_reports
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Anyone can create issue reports
CREATE POLICY "Anyone can create issue reports"
  ON public.issue_reports
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own reports
CREATE POLICY "Users can update their own issue reports"
  ON public.issue_reports
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_issue_reports_user_id ON public.issue_reports(user_id);
CREATE INDEX idx_issue_reports_status ON public.issue_reports(status);
CREATE INDEX idx_issue_reports_created_at ON public.issue_reports(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_issue_reports_updated_at
  BEFORE UPDATE ON public.issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();