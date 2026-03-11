
-- Phase 1a: Add policies to 9 tables with RLS enabled but NO policies

-- itam_tag_series
CREATE POLICY "Authenticated ALL" ON public.itam_tag_series FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_tag_format
CREATE POLICY "Authenticated ALL" ON public.itam_tag_format FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_settings
CREATE POLICY "Authenticated ALL" ON public.itam_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_email_config
CREATE POLICY "Authenticated ALL" ON public.itam_email_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_email_logs (SELECT + INSERT only)
CREATE POLICY "Authenticated SELECT" ON public.itam_email_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT" ON public.itam_email_logs FOR INSERT TO authenticated WITH CHECK (true);

-- itam_maintenance_schedules
CREATE POLICY "Authenticated ALL" ON public.itam_maintenance_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_purchase_orders
CREATE POLICY "Authenticated ALL" ON public.itam_purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- system_update_alerts
CREATE POLICY "Authenticated ALL" ON public.system_update_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- system_update_ingest_logs
CREATE POLICY "Authenticated ALL" ON public.system_update_ingest_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Phase 1b: Tighten overly permissive policies to authenticated-only
-- Drop and recreate policies that use USING(true) without role restriction

-- itam_assets
DROP POLICY IF EXISTS "auth_all" ON public.itam_assets;
CREATE POLICY "Authenticated ALL" ON public.itam_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_categories
DROP POLICY IF EXISTS "auth_all" ON public.itam_categories;
CREATE POLICY "Authenticated ALL" ON public.itam_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_departments
DROP POLICY IF EXISTS "auth_all" ON public.itam_departments;
CREATE POLICY "Authenticated ALL" ON public.itam_departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_asset_assignments
DROP POLICY IF EXISTS "auth_all" ON public.itam_asset_assignments;
CREATE POLICY "Authenticated ALL" ON public.itam_asset_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_asset_documents
DROP POLICY IF EXISTS "auth_all" ON public.itam_asset_documents;
CREATE POLICY "Authenticated ALL" ON public.itam_asset_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_asset_links
DROP POLICY IF EXISTS "auth_all" ON public.itam_asset_links;
CREATE POLICY "Authenticated ALL" ON public.itam_asset_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_asset_reservations
DROP POLICY IF EXISTS "auth_all" ON public.itam_asset_reservations;
CREATE POLICY "Authenticated ALL" ON public.itam_asset_reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- category_tag_formats
DROP POLICY IF EXISTS "auth_all" ON public.category_tag_formats;
CREATE POLICY "Authenticated ALL" ON public.category_tag_formats FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_saved_views
DROP POLICY IF EXISTS "auth_all" ON public.helpdesk_saved_views;
CREATE POLICY "Authenticated ALL" ON public.helpdesk_saved_views FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_canned_responses
DROP POLICY IF EXISTS "auth_all" ON public.helpdesk_canned_responses;
CREATE POLICY "Authenticated ALL" ON public.helpdesk_canned_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_ticket_templates
DROP POLICY IF EXISTS "auth_all" ON public.helpdesk_ticket_templates;
CREATE POLICY "Authenticated ALL" ON public.helpdesk_ticket_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- backup_restore_logs
DROP POLICY IF EXISTS "auth_all" ON public.backup_restore_logs;
CREATE POLICY "Authenticated ALL" ON public.backup_restore_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Phase 1c & 1d: Fix public data exposure
-- currencies: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view active currencies" ON public.currencies;
CREATE POLICY "Authenticated can view active currencies" ON public.currencies FOR SELECT TO authenticated USING (is_active = true);

-- Tighten remaining tables with duplicate ALL+SELECT policies to authenticated
-- audit_logs
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated SELECT audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- backup_schedules
DROP POLICY IF EXISTS "Authenticated users can manage backup schedules" ON public.backup_schedules;
DROP POLICY IF EXISTS "Authenticated users can view backup schedules" ON public.backup_schedules;
CREATE POLICY "Authenticated ALL backup_schedules" ON public.backup_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_automation_logs
DROP POLICY IF EXISTS "Authenticated users can insert automation logs" ON public.helpdesk_automation_logs;
DROP POLICY IF EXISTS "Authenticated users can view automation logs" ON public.helpdesk_automation_logs;
CREATE POLICY "Authenticated SELECT automation_logs" ON public.helpdesk_automation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT automation_logs" ON public.helpdesk_automation_logs FOR INSERT TO authenticated WITH CHECK (true);

-- helpdesk_automation_rules
DROP POLICY IF EXISTS "Authenticated users can manage automation rules" ON public.helpdesk_automation_rules;
DROP POLICY IF EXISTS "Authenticated users can view automation rules" ON public.helpdesk_automation_rules;
CREATE POLICY "Authenticated ALL automation_rules" ON public.helpdesk_automation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_categories
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.helpdesk_categories;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.helpdesk_categories;
CREATE POLICY "Authenticated ALL helpdesk_categories" ON public.helpdesk_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_change_approvals
DROP POLICY IF EXISTS "Authenticated users can manage change approvals" ON public.helpdesk_change_approvals;
DROP POLICY IF EXISTS "Authenticated users can view change approvals" ON public.helpdesk_change_approvals;
CREATE POLICY "Authenticated ALL change_approvals" ON public.helpdesk_change_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_changes
DROP POLICY IF EXISTS "Authenticated users can manage changes" ON public.helpdesk_changes;
DROP POLICY IF EXISTS "Authenticated users can view changes" ON public.helpdesk_changes;
CREATE POLICY "Authenticated ALL helpdesk_changes" ON public.helpdesk_changes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_csat_ratings
DROP POLICY IF EXISTS "Authenticated users can manage CSAT ratings" ON public.helpdesk_csat_ratings;
DROP POLICY IF EXISTS "Authenticated users can view CSAT ratings" ON public.helpdesk_csat_ratings;
CREATE POLICY "Authenticated ALL csat_ratings" ON public.helpdesk_csat_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_kb_article_feedback
DROP POLICY IF EXISTS "Authenticated users can manage KB feedback" ON public.helpdesk_kb_article_feedback;
DROP POLICY IF EXISTS "Authenticated users can view KB feedback" ON public.helpdesk_kb_article_feedback;
CREATE POLICY "Authenticated ALL kb_feedback" ON public.helpdesk_kb_article_feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_kb_articles
DROP POLICY IF EXISTS "Authenticated users can manage KB articles" ON public.helpdesk_kb_articles;
DROP POLICY IF EXISTS "Authenticated users can view KB articles" ON public.helpdesk_kb_articles;
CREATE POLICY "Authenticated ALL kb_articles" ON public.helpdesk_kb_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_kb_categories
DROP POLICY IF EXISTS "Authenticated users can manage KB categories" ON public.helpdesk_kb_categories;
DROP POLICY IF EXISTS "Authenticated users can view KB categories" ON public.helpdesk_kb_categories;
CREATE POLICY "Authenticated ALL kb_categories" ON public.helpdesk_kb_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_problem_tickets
DROP POLICY IF EXISTS "Authenticated users can manage problem tickets" ON public.helpdesk_problem_tickets;
DROP POLICY IF EXISTS "Authenticated users can view problem tickets" ON public.helpdesk_problem_tickets;
CREATE POLICY "Authenticated ALL problem_tickets" ON public.helpdesk_problem_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_problems
DROP POLICY IF EXISTS "Authenticated users can create problems" ON public.helpdesk_problems;
DROP POLICY IF EXISTS "Authenticated users can update problems" ON public.helpdesk_problems;
DROP POLICY IF EXISTS "Authenticated users can view problems" ON public.helpdesk_problems;
CREATE POLICY "Authenticated ALL helpdesk_problems" ON public.helpdesk_problems FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_queue_members
DROP POLICY IF EXISTS "Authenticated users can manage queue members" ON public.helpdesk_queue_members;
DROP POLICY IF EXISTS "Authenticated users can view queue members" ON public.helpdesk_queue_members;
CREATE POLICY "Authenticated ALL queue_members" ON public.helpdesk_queue_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_queues
DROP POLICY IF EXISTS "Authenticated users can manage queues" ON public.helpdesk_queues;
DROP POLICY IF EXISTS "Authenticated users can view queues" ON public.helpdesk_queues;
CREATE POLICY "Authenticated ALL helpdesk_queues" ON public.helpdesk_queues FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_sla_policies
DROP POLICY IF EXISTS "Authenticated users can manage SLA policies" ON public.helpdesk_sla_policies;
DROP POLICY IF EXISTS "Authenticated users can view SLA policies" ON public.helpdesk_sla_policies;
CREATE POLICY "Authenticated ALL sla_policies" ON public.helpdesk_sla_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_ticket_attachments
DROP POLICY IF EXISTS "Authenticated users can manage ticket attachments" ON public.helpdesk_ticket_attachments;
DROP POLICY IF EXISTS "Authenticated users can view ticket attachments" ON public.helpdesk_ticket_attachments;
CREATE POLICY "Authenticated ALL ticket_attachments" ON public.helpdesk_ticket_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_ticket_comments
DROP POLICY IF EXISTS "Authenticated users can manage ticket comments" ON public.helpdesk_ticket_comments;
DROP POLICY IF EXISTS "Authenticated users can view ticket comments" ON public.helpdesk_ticket_comments;
CREATE POLICY "Authenticated ALL ticket_comments" ON public.helpdesk_ticket_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_ticket_history
DROP POLICY IF EXISTS "Authenticated users can insert ticket history" ON public.helpdesk_ticket_history;
DROP POLICY IF EXISTS "Authenticated users can view ticket history" ON public.helpdesk_ticket_history;
CREATE POLICY "Authenticated SELECT ticket_history" ON public.helpdesk_ticket_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT ticket_history" ON public.helpdesk_ticket_history FOR INSERT TO authenticated WITH CHECK (true);

-- helpdesk_ticket_watchers
DROP POLICY IF EXISTS "Authenticated users can manage ticket watchers" ON public.helpdesk_ticket_watchers;
DROP POLICY IF EXISTS "Authenticated users can view ticket watchers" ON public.helpdesk_ticket_watchers;
CREATE POLICY "Authenticated ALL ticket_watchers" ON public.helpdesk_ticket_watchers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_tickets
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Authenticated users can delete tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.helpdesk_tickets;
CREATE POLICY "Authenticated ALL helpdesk_tickets" ON public.helpdesk_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- helpdesk_time_entries
DROP POLICY IF EXISTS "Authenticated users can manage time entries" ON public.helpdesk_time_entries;
DROP POLICY IF EXISTS "Authenticated users can view time entries" ON public.helpdesk_time_entries;
CREATE POLICY "Authenticated ALL time_entries" ON public.helpdesk_time_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itam_asset_history
DROP POLICY IF EXISTS "Authenticated users can insert asset history" ON public.itam_asset_history;
DROP POLICY IF EXISTS "Authenticated users can view asset history" ON public.itam_asset_history;
CREATE POLICY "Authenticated SELECT asset_history" ON public.itam_asset_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated INSERT asset_history" ON public.itam_asset_history FOR INSERT TO authenticated WITH CHECK (true);

-- itam_company_info
DROP POLICY IF EXISTS "Authenticated users can manage company info" ON public.itam_company_info;
DROP POLICY IF EXISTS "Authenticated users can view company info" ON public.itam_company_info;
CREATE POLICY "Authenticated ALL company_info" ON public.itam_company_info FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- currencies admin policies (keep as-is, already role-restricted)
DROP POLICY IF EXISTS "Admins can insert currencies" ON public.currencies;
DROP POLICY IF EXISTS "Admins can update currencies" ON public.currencies;
CREATE POLICY "Admins can insert currencies" ON public.currencies FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = ANY(ARRAY['admin','owner'])));
CREATE POLICY "Admins can update currencies" ON public.currencies FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = ANY(ARRAY['admin','owner'])));
