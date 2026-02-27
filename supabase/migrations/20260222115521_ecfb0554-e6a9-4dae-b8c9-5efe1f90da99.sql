-- Fix stale database functions that reference users.organisation_id (column no longer exists)

-- 1. Fix check_subscription_limit
CREATE OR REPLACE FUNCTION public.check_subscription_limit(org_id uuid, limit_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_limit INTEGER;
  current_count INTEGER;
BEGIN
  -- Get the limit from subscription
  SELECT (limits->>limit_type)::INTEGER INTO current_limit
  FROM subscriptions
  WHERE organisation_id = org_id AND status = 'active';
  
  -- If no subscription or unlimited (-1), always return true
  IF current_limit IS NULL OR current_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Check current count based on limit type
  IF limit_type = 'max_users' THEN
    SELECT COUNT(*) INTO current_count
    FROM users
    WHERE status = 'active';
  ELSIF limit_type = 'max_tools' THEN
    SELECT COALESCE(array_length(active_tools, 1), 0) INTO current_count
    FROM organisations
    WHERE id = org_id;
  END IF;
  
  RETURN current_count < current_limit;
END;
$$;

-- 2. Fix create_notification - remove organisation_id parameter reference
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, 
  p_title text, 
  p_message text, 
  p_type text DEFAULT 'info',
  p_tenant_id bigint DEFAULT NULL,
  p_organisation_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, tenant_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_tenant_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- 3. Fix bulk_soft_delete_tickets
CREATE OR REPLACE FUNCTION public.bulk_soft_delete_tickets(ticket_ids bigint[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE helpdesk_tickets
  SET is_deleted = TRUE,
      updated_at = NOW()
  WHERE id = ANY(ticket_ids);
END;
$$;

-- 4. Fix bulk_soft_delete_problems
CREATE OR REPLACE FUNCTION public.bulk_soft_delete_problems(problem_ids bigint[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE helpdesk_problems
  SET is_deleted = TRUE,
      updated_at = NOW()
  WHERE id = ANY(problem_ids);
END;
$$;