
-- Phase 2: Fix function search paths (only existing functions)
ALTER FUNCTION public.bulk_soft_delete_problems(bigint[]) SET search_path = public;
ALTER FUNCTION public.bulk_soft_delete_tickets(bigint[]) SET search_path = public;
ALTER FUNCTION public.check_subscription_limit(uuid, text) SET search_path = public;
ALTER FUNCTION public.create_notification(uuid, text, text, text, bigint, uuid) SET search_path = public;
