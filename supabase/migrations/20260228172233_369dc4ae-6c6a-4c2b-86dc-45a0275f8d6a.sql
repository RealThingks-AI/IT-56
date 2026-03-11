
-- Add missing RLS policies to 7 unprotected tables

-- 1. helpdesk_automation_rules
ALTER TABLE public.helpdesk_automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view automation rules"
  ON public.helpdesk_automation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage automation rules"
  ON public.helpdesk_automation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. helpdesk_queues
ALTER TABLE public.helpdesk_queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view queues"
  ON public.helpdesk_queues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage queues"
  ON public.helpdesk_queues FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. helpdesk_sla_policies
ALTER TABLE public.helpdesk_sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view SLA policies"
  ON public.helpdesk_sla_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage SLA policies"
  ON public.helpdesk_sla_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. helpdesk_kb_articles
ALTER TABLE public.helpdesk_kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view KB articles"
  ON public.helpdesk_kb_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage KB articles"
  ON public.helpdesk_kb_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. helpdesk_kb_categories
ALTER TABLE public.helpdesk_kb_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view KB categories"
  ON public.helpdesk_kb_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage KB categories"
  ON public.helpdesk_kb_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. helpdesk_changes
ALTER TABLE public.helpdesk_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view changes"
  ON public.helpdesk_changes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage changes"
  ON public.helpdesk_changes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. itam_company_info
ALTER TABLE public.itam_company_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view company info"
  ON public.itam_company_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage company info"
  ON public.itam_company_info FOR ALL TO authenticated USING (true) WITH CHECK (true);
