-- Add missing RLS policies for complete security coverage

-- Complete policies for helpdesk_tickets
CREATE POLICY "org_isolation_delete_tickets" ON public.helpdesk_tickets
  FOR DELETE USING (
    (organisation_id = get_user_org() OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    AND EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Complete policies for helpdesk_ticket_comments
CREATE POLICY "org_isolation_update_comments" ON public.helpdesk_ticket_comments
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "org_isolation_delete_comments" ON public.helpdesk_ticket_comments
  FOR DELETE USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Complete policies for helpdesk_ticket_attachments
CREATE POLICY "org_isolation_delete_attachments" ON public.helpdesk_ticket_attachments
  FOR DELETE USING (
    uploaded_by = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Complete policies for helpdesk_ticket_history (read-only for users, system inserts)
CREATE POLICY "system_insert_history" ON public.helpdesk_ticket_history
  FOR INSERT WITH CHECK (true);