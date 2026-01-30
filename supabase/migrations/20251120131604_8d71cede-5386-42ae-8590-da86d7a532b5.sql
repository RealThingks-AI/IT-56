-- Create notification types enum
CREATE TYPE public.notification_type AS ENUM (
  'profile_update',
  'role_change',
  'ticket_created',
  'ticket_updated',
  'system_alert',
  'broadcast',
  'general'
);

-- Create broadcast target audience enum
CREATE TYPE public.broadcast_target_audience AS ENUM (
  'individual_users',
  'organization_admins',
  'organization_users',
  'all_users'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id BIGINT,
  organisation_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create broadcasts table
CREATE TABLE public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_audience public.broadcast_target_audience NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create broadcast dismissals table
CREATE TABLE public.broadcast_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(broadcast_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_dismissals ENABLE ROW LEVEL SECURITY;

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Broadcasts RLS policies
CREATE POLICY "Super admins can manage broadcasts"
  ON public.broadcasts FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view active broadcasts"
  ON public.broadcasts FOR SELECT
  USING (is_active = true AND (scheduled_for IS NULL OR scheduled_for <= now()) AND (expires_at IS NULL OR expires_at > now()));

-- Broadcast dismissals RLS policies
CREATE POLICY "Users can manage their own dismissals"
  ON public.broadcast_dismissals FOR ALL
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_broadcasts_is_active ON public.broadcasts(is_active);
CREATE INDEX idx_broadcasts_scheduled_for ON public.broadcasts(scheduled_for);
CREATE INDEX idx_broadcast_dismissals_user_id ON public.broadcast_dismissals(user_id);
CREATE INDEX idx_broadcast_dismissals_broadcast_id ON public.broadcast_dismissals(broadcast_id);

-- Create trigger for updated_at on broadcasts
CREATE TRIGGER update_broadcasts_updated_at
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();