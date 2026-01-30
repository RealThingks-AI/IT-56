-- Create recovery verification codes table
CREATE TABLE IF NOT EXISTS public.recovery_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'phone')),
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recovery_verification_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification codes
CREATE POLICY "Users can view their own codes"
  ON public.recovery_verification_codes
  FOR SELECT
  USING (user_id = auth.uid());

-- System can insert verification codes
CREATE POLICY "System can insert codes"
  ON public.recovery_verification_codes
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own codes (for marking as verified)
CREATE POLICY "Users can update their own codes"
  ON public.recovery_verification_codes
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_recovery_codes_user_id ON public.recovery_verification_codes(user_id);
CREATE INDEX idx_recovery_codes_expires_at ON public.recovery_verification_codes(expires_at);

-- Function to clean up expired codes
CREATE OR REPLACE FUNCTION clean_expired_recovery_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM recovery_verification_codes
  WHERE expires_at < now() - INTERVAL '7 days';
END;
$$;