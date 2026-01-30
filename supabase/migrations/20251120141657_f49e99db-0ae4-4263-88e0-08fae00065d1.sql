-- Create user_recovery_options table
CREATE TABLE IF NOT EXISTS public.user_recovery_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_email TEXT,
  recovery_phone TEXT,
  recovery_email_verified BOOLEAN DEFAULT false,
  recovery_phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_recovery UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_recovery_options ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own recovery options"
ON public.user_recovery_options
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recovery options"
ON public.user_recovery_options
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery options"
ON public.user_recovery_options
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recovery options"
ON public.user_recovery_options
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_user_recovery_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_recovery_options_updated_at
BEFORE UPDATE ON public.user_recovery_options
FOR EACH ROW
EXECUTE FUNCTION public.update_user_recovery_options_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_user_recovery_options_user_id ON public.user_recovery_options(user_id);