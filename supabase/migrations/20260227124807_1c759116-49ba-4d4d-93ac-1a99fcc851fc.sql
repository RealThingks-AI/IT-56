
CREATE TABLE IF NOT EXISTS public.itam_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id bigint DEFAULT 1,
  template_id text NOT NULL,
  recipient_email text NOT NULL,
  subject text,
  status text DEFAULT 'sent',
  error_message text,
  sent_by uuid,
  asset_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.itam_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view email logs"
  ON public.itam_email_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert email logs"
  ON public.itam_email_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete email logs"
  ON public.itam_email_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX idx_itam_email_logs_created_at ON public.itam_email_logs (created_at DESC);
CREATE INDEX idx_itam_email_logs_template_id ON public.itam_email_logs (template_id);
