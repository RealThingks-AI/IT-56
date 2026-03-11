-- ============================================================
-- Phase 3+4: RLS Hardening for remaining permissive tables
-- Replaces USING(true)/WITH CHECK(true) on write ops with
-- proper role-based policies using public.has_role() / has_any_role()
-- ============================================================

-- ── PART E: Core operational tables (tickets, problems, changes) ──

-- helpdesk_tickets: all auth can INSERT/UPDATE, only admin DELETE
DROP POLICY IF EXISTS "Authenticated ALL helpdesk_tickets" ON helpdesk_tickets;
CREATE POLICY "Authenticated SELECT helpdesk_tickets" ON helpdesk_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT helpdesk_tickets" ON helpdesk_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated UPDATE helpdesk_tickets" ON helpdesk_tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin DELETE helpdesk_tickets" ON helpdesk_tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- helpdesk_problems: admin/manager write, all read
DROP POLICY IF EXISTS "Authenticated ALL helpdesk_problems" ON helpdesk_problems;
CREATE POLICY "Authenticated SELECT helpdesk_problems" ON helpdesk_problems FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT helpdesk_problems" ON helpdesk_problems FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager UPDATE helpdesk_problems" ON helpdesk_problems FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE helpdesk_problems" ON helpdesk_problems FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- helpdesk_changes: admin/manager write
DROP POLICY IF EXISTS "Authenticated ALL helpdesk_changes" ON helpdesk_changes;
CREATE POLICY "Authenticated SELECT helpdesk_changes" ON helpdesk_changes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT helpdesk_changes" ON helpdesk_changes FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager UPDATE helpdesk_changes" ON helpdesk_changes FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE helpdesk_changes" ON helpdesk_changes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- helpdesk_change_approvals
DROP POLICY IF EXISTS "Authenticated ALL change_approvals" ON helpdesk_change_approvals;
CREATE POLICY "Authenticated SELECT change_approvals" ON helpdesk_change_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT change_approvals" ON helpdesk_change_approvals FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager UPDATE change_approvals" ON helpdesk_change_approvals FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE change_approvals" ON helpdesk_change_approvals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ── PART F: Ticket sub-tables ──

-- Comments: all auth INSERT/UPDATE, admin DELETE
DROP POLICY IF EXISTS "Authenticated ALL ticket_comments" ON helpdesk_ticket_comments;
CREATE POLICY "Authenticated SELECT ticket_comments" ON helpdesk_ticket_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT ticket_comments" ON helpdesk_ticket_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated UPDATE ticket_comments" ON helpdesk_ticket_comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin DELETE ticket_comments" ON helpdesk_ticket_comments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Attachments: all auth INSERT, admin/manager UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated ALL ticket_attachments" ON helpdesk_ticket_attachments;
CREATE POLICY "Authenticated SELECT ticket_attachments" ON helpdesk_ticket_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT ticket_attachments" ON helpdesk_ticket_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin Manager UPDATE ticket_attachments" ON helpdesk_ticket_attachments FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE ticket_attachments" ON helpdesk_ticket_attachments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Watchers: all auth INSERT/DELETE (users can add/remove themselves)
DROP POLICY IF EXISTS "Authenticated ALL ticket_watchers" ON helpdesk_ticket_watchers;
CREATE POLICY "Authenticated SELECT ticket_watchers" ON helpdesk_ticket_watchers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT ticket_watchers" ON helpdesk_ticket_watchers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated DELETE ticket_watchers" ON helpdesk_ticket_watchers FOR DELETE TO authenticated USING (true);

-- Time entries: all auth INSERT/UPDATE, admin DELETE
DROP POLICY IF EXISTS "Authenticated ALL time_entries" ON helpdesk_time_entries;
CREATE POLICY "Authenticated SELECT time_entries" ON helpdesk_time_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT time_entries" ON helpdesk_time_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated UPDATE time_entries" ON helpdesk_time_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin DELETE time_entries" ON helpdesk_time_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Problem-ticket links: admin/manager write
DROP POLICY IF EXISTS "Authenticated ALL problem_tickets" ON helpdesk_problem_tickets;
CREATE POLICY "Authenticated SELECT problem_tickets" ON helpdesk_problem_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT problem_tickets" ON helpdesk_problem_tickets FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager DELETE problem_tickets" ON helpdesk_problem_tickets FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- ── PART G: Knowledge base & CSAT ──

-- KB articles: admin/manager write
DROP POLICY IF EXISTS "Authenticated ALL kb_articles" ON helpdesk_kb_articles;
CREATE POLICY "Authenticated SELECT kb_articles" ON helpdesk_kb_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT kb_articles" ON helpdesk_kb_articles FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager UPDATE kb_articles" ON helpdesk_kb_articles FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE kb_articles" ON helpdesk_kb_articles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- KB feedback: all auth INSERT, admin DELETE
DROP POLICY IF EXISTS "Authenticated ALL kb_feedback" ON helpdesk_kb_article_feedback;
CREATE POLICY "Authenticated SELECT kb_feedback" ON helpdesk_kb_article_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT kb_feedback" ON helpdesk_kb_article_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin DELETE kb_feedback" ON helpdesk_kb_article_feedback FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CSAT ratings: all auth INSERT, admin DELETE
DROP POLICY IF EXISTS "Authenticated ALL csat_ratings" ON helpdesk_csat_ratings;
CREATE POLICY "Authenticated SELECT csat_ratings" ON helpdesk_csat_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT csat_ratings" ON helpdesk_csat_ratings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin DELETE csat_ratings" ON helpdesk_csat_ratings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Canned responses: admin/manager write
DROP POLICY IF EXISTS "Authenticated ALL" ON helpdesk_canned_responses;
CREATE POLICY "Authenticated SELECT canned_responses" ON helpdesk_canned_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT canned_responses" ON helpdesk_canned_responses FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager UPDATE canned_responses" ON helpdesk_canned_responses FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE canned_responses" ON helpdesk_canned_responses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Saved views: own user only
DROP POLICY IF EXISTS "Authenticated ALL" ON helpdesk_saved_views;
CREATE POLICY "Own user SELECT saved_views" ON helpdesk_saved_views FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_shared = true);
CREATE POLICY "Own user INSERT saved_views" ON helpdesk_saved_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own user UPDATE saved_views" ON helpdesk_saved_views FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own user DELETE saved_views" ON helpdesk_saved_views FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── PART H: Asset sub-tables ──

-- itam_assets: admin/manager write
DROP POLICY IF EXISTS "Authenticated ALL" ON itam_assets;
CREATE POLICY "Authenticated SELECT itam_assets" ON itam_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT itam_assets" ON itam_assets FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager UPDATE itam_assets" ON itam_assets FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE itam_assets" ON itam_assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_asset_assignments: admin/manager write
DROP POLICY IF EXISTS "Authenticated ALL" ON itam_asset_assignments;
CREATE POLICY "Authenticated SELECT itam_asset_assignments" ON itam_asset_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT itam_asset_assignments" ON itam_asset_assignments FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager UPDATE itam_asset_assignments" ON itam_asset_assignments FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE itam_asset_assignments" ON itam_asset_assignments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_asset_documents: admin/manager write
DROP POLICY IF EXISTS "Authenticated ALL" ON itam_asset_documents;
CREATE POLICY "Authenticated SELECT itam_asset_documents" ON itam_asset_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT itam_asset_documents" ON itam_asset_documents FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager UPDATE itam_asset_documents" ON itam_asset_documents FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE itam_asset_documents" ON itam_asset_documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_asset_links: admin/manager write
DROP POLICY IF EXISTS "Authenticated ALL" ON itam_asset_links;
CREATE POLICY "Authenticated SELECT itam_asset_links" ON itam_asset_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT itam_asset_links" ON itam_asset_links FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE itam_asset_links" ON itam_asset_links FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- itam_asset_reservations: admin/manager write
DROP POLICY IF EXISTS "Authenticated ALL" ON itam_asset_reservations;
CREATE POLICY "Authenticated SELECT itam_asset_reservations" ON itam_asset_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manager INSERT itam_asset_reservations" ON itam_asset_reservations FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin Manager UPDATE itam_asset_reservations" ON itam_asset_reservations FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Admin DELETE itam_asset_reservations" ON itam_asset_reservations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ── PART I: System/audit tables (keep INSERT for triggers, restrict direct user writes) ──

-- audit_logs: admin/manager INSERT (triggers use SECURITY DEFINER so bypass RLS)
DROP POLICY IF EXISTS "Authenticated INSERT audit_logs" ON audit_logs;
CREATE POLICY "Admin Manager INSERT audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- helpdesk_automation_logs: admin only INSERT
DROP POLICY IF EXISTS "Authenticated INSERT automation_logs" ON helpdesk_automation_logs;
CREATE POLICY "Admin INSERT automation_logs" ON helpdesk_automation_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- helpdesk_ticket_history: admin/manager INSERT (triggers use SECURITY DEFINER)
DROP POLICY IF EXISTS "Authenticated INSERT ticket_history" ON helpdesk_ticket_history;
CREATE POLICY "Admin Manager INSERT ticket_history" ON helpdesk_ticket_history FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- itam_asset_history: admin/manager INSERT
DROP POLICY IF EXISTS "Authenticated INSERT asset_history" ON itam_asset_history;
CREATE POLICY "Admin Manager INSERT asset_history" ON itam_asset_history FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));