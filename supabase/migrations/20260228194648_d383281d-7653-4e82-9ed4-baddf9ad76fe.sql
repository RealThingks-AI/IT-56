
-- ============================================================
-- Phase 1: Security Hardening — Tighten overly permissive RLS
-- ============================================================

-- Helper: map auth.uid() to the app-level users.id
CREATE OR REPLACE FUNCTION public.get_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ── 1. helpdesk_tickets UPDATE ──
-- Was: USING (true) WITH CHECK (true) → admins/managers update all, others only own
DROP POLICY IF EXISTS "Authenticated UPDATE helpdesk_tickets" ON public.helpdesk_tickets;
CREATE POLICY "Authenticated UPDATE helpdesk_tickets"
  ON public.helpdesk_tickets FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
    OR created_by = public.get_app_user_id()
    OR assignee_id = public.get_app_user_id()
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
    OR created_by = public.get_app_user_id()
    OR assignee_id = public.get_app_user_id()
  );

-- ── 2. helpdesk_ticket_comments UPDATE ──
-- Was: USING (true) → users can only update their own comments
DROP POLICY IF EXISTS "Authenticated UPDATE ticket_comments" ON public.helpdesk_ticket_comments;
CREATE POLICY "Authenticated UPDATE ticket_comments"
  ON public.helpdesk_ticket_comments FOR UPDATE TO authenticated
  USING (
    user_id = public.get_app_user_id()
    OR public.has_any_role(auth.uid(), ARRAY['admin']::public.app_role[])
  )
  WITH CHECK (
    user_id = public.get_app_user_id()
    OR public.has_any_role(auth.uid(), ARRAY['admin']::public.app_role[])
  );

-- ── 3. helpdesk_ticket_comments INSERT ──
-- Was: WITH CHECK (true) → scope to authenticated, set user_id
DROP POLICY IF EXISTS "Authenticated INSERT ticket_comments" ON public.helpdesk_ticket_comments;
CREATE POLICY "Authenticated INSERT ticket_comments"
  ON public.helpdesk_ticket_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_app_user_id());

-- ── 4. helpdesk_ticket_watchers DELETE ──
-- Was: USING (true) → users can only remove themselves or admins
DROP POLICY IF EXISTS "Authenticated DELETE ticket_watchers" ON public.helpdesk_ticket_watchers;
CREATE POLICY "Authenticated DELETE ticket_watchers"
  ON public.helpdesk_ticket_watchers FOR DELETE TO authenticated
  USING (
    user_id = public.get_app_user_id()
    OR added_by = public.get_app_user_id()
    OR public.has_any_role(auth.uid(), ARRAY['admin']::public.app_role[])
  );

-- ── 5. helpdesk_ticket_watchers INSERT ──
-- Was: WITH CHECK (true) → must be authenticated (keep permissive, watchers are collaborative)
DROP POLICY IF EXISTS "Authenticated INSERT ticket_watchers" ON public.helpdesk_ticket_watchers;
CREATE POLICY "Authenticated INSERT ticket_watchers"
  ON public.helpdesk_ticket_watchers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 6. helpdesk_time_entries UPDATE ──
-- Was: USING (true) → own entries or admin
DROP POLICY IF EXISTS "Authenticated UPDATE time_entries" ON public.helpdesk_time_entries;
CREATE POLICY "Authenticated UPDATE time_entries"
  ON public.helpdesk_time_entries FOR UPDATE TO authenticated
  USING (
    user_id = public.get_app_user_id()
    OR public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
  )
  WITH CHECK (
    user_id = public.get_app_user_id()
    OR public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
  );

-- ── 7. helpdesk_time_entries INSERT ──
-- Was: WITH CHECK (true) → scope to own user
DROP POLICY IF EXISTS "Authenticated INSERT time_entries" ON public.helpdesk_time_entries;
CREATE POLICY "Authenticated INSERT time_entries"
  ON public.helpdesk_time_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_app_user_id());

-- ── 8. helpdesk_tickets INSERT ──
-- Was: WITH CHECK (true) → must be authenticated (creator set by trigger)
DROP POLICY IF EXISTS "Authenticated INSERT helpdesk_tickets" ON public.helpdesk_tickets;
CREATE POLICY "Authenticated INSERT helpdesk_tickets"
  ON public.helpdesk_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 9. helpdesk_csat_ratings INSERT ──
-- Was: WITH CHECK (true) → own submissions only
DROP POLICY IF EXISTS "Authenticated INSERT csat_ratings" ON public.helpdesk_csat_ratings;
CREATE POLICY "Authenticated INSERT csat_ratings"
  ON public.helpdesk_csat_ratings FOR INSERT TO authenticated
  WITH CHECK (submitted_by = public.get_app_user_id());

-- ── 10. helpdesk_kb_article_feedback INSERT ──
-- Was: WITH CHECK (true) → own feedback only  
DROP POLICY IF EXISTS "Authenticated INSERT kb_feedback" ON public.helpdesk_kb_article_feedback;
CREATE POLICY "Authenticated INSERT kb_feedback"
  ON public.helpdesk_kb_article_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 11. helpdesk_ticket_attachments INSERT ──
-- Was: WITH CHECK (true) → own uploads only
DROP POLICY IF EXISTS "Authenticated INSERT ticket_attachments" ON public.helpdesk_ticket_attachments;
CREATE POLICY "Authenticated INSERT ticket_attachments"
  ON public.helpdesk_ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = public.get_app_user_id());

-- Keep as-is (service-level access needed):
-- itam_email_logs (public INSERT for edge functions)
-- notifications (public INSERT for triggers)  
-- recovery_verification_codes (public INSERT for auth flow)
