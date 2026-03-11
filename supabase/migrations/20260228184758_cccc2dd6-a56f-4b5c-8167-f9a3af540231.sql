
-- Phase 1: Security Hardening - RLS Policy Overhaul

-- PART A: Add policies to 9 tables with RLS enabled but NO policies

-- monitoring_alerts
CREATE POLICY "Authenticated SELECT monitoring_alerts" ON public.monitoring_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager INSERT monitoring_alerts" ON public.monitoring_alerts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Manager UPDATE monitoring_alerts" ON public.monitoring_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE monitoring_alerts" ON public.monitoring_alerts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- monitoring_incidents
CREATE POLICY "Authenticated SELECT monitoring_incidents" ON public.monitoring_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager INSERT monitoring_incidents" ON public.monitoring_incidents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Manager UPDATE monitoring_incidents" ON public.monitoring_incidents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE monitoring_incidents" ON public.monitoring_incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- monitors
CREATE POLICY "Authenticated SELECT monitors" ON public.monitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager INSERT monitors" ON public.monitors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Manager UPDATE monitors" ON public.monitors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE monitors" ON public.monitors FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions_licenses
CREATE POLICY "Authenticated SELECT subscriptions_licenses" ON public.subscriptions_licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager INSERT subscriptions_licenses" ON public.subscriptions_licenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Manager UPDATE subscriptions_licenses" ON public.subscriptions_licenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE subscriptions_licenses" ON public.subscriptions_licenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions_payments
CREATE POLICY "Authenticated SELECT subscriptions_payments" ON public.subscriptions_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager INSERT subscriptions_payments" ON public.subscriptions_payments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Manager UPDATE subscriptions_payments" ON public.subscriptions_payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE subscriptions_payments" ON public.subscriptions_payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions_tools
CREATE POLICY "Authenticated SELECT subscriptions_tools" ON public.subscriptions_tools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager INSERT subscriptions_tools" ON public.subscriptions_tools FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Manager UPDATE subscriptions_tools" ON public.subscriptions_tools FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE subscriptions_tools" ON public.subscriptions_tools FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions_vendors
CREATE POLICY "Authenticated SELECT subscriptions_vendors" ON public.subscriptions_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager INSERT subscriptions_vendors" ON public.subscriptions_vendors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Manager UPDATE subscriptions_vendors" ON public.subscriptions_vendors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE subscriptions_vendors" ON public.subscriptions_vendors FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- system_devices
CREATE POLICY "Authenticated SELECT system_devices" ON public.system_devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager INSERT system_devices" ON public.system_devices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Manager UPDATE system_devices" ON public.system_devices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE system_devices" ON public.system_devices FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- system_updates
CREATE POLICY "Authenticated SELECT system_updates" ON public.system_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager INSERT system_updates" ON public.system_updates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Manager UPDATE system_updates" ON public.system_updates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE system_updates" ON public.system_updates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PART B: Tighten admin-only tables

-- backup_restore_logs
DROP POLICY IF EXISTS "Authenticated ALL" ON public.backup_restore_logs;
CREATE POLICY "Authenticated SELECT backup_restore_logs" ON public.backup_restore_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT backup_restore_logs" ON public.backup_restore_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE backup_restore_logs" ON public.backup_restore_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- backup_schedules
DROP POLICY IF EXISTS "Authenticated ALL backup_schedules" ON public.backup_schedules;
CREATE POLICY "Authenticated SELECT backup_schedules" ON public.backup_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT backup_schedules" ON public.backup_schedules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE backup_schedules" ON public.backup_schedules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin DELETE backup_schedules" ON public.backup_schedules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- system_backups
DROP POLICY IF EXISTS "Authenticated users can manage system backups" ON public.system_backups;
CREATE POLICY "Authenticated SELECT system_backups" ON public.system_backups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT system_backups" ON public.system_backups FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE system_backups" ON public.system_backups FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin DELETE system_backups" ON public.system_backups FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- roles
DROP POLICY IF EXISTS "auth_manage_roles" ON public.roles;
CREATE POLICY "Authenticated SELECT roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage roles writes" ON public.roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE roles" ON public.roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin DELETE roles" ON public.roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- role_permissions
DROP POLICY IF EXISTS "auth_manage_role_perms" ON public.role_permissions;
CREATE POLICY "Authenticated SELECT role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage role_permissions writes" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE role_permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin DELETE role_permissions" ON public.role_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- page_access_control
DROP POLICY IF EXISTS "Authenticated users can manage page access" ON public.page_access_control;
CREATE POLICY "Authenticated SELECT page_access_control" ON public.page_access_control FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage page_access writes" ON public.page_access_control FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE page_access" ON public.page_access_control FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin DELETE page_access" ON public.page_access_control FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_company_info
DROP POLICY IF EXISTS "Authenticated ALL company_info" ON public.itam_company_info;
CREATE POLICY "Authenticated SELECT itam_company_info" ON public.itam_company_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT itam_company_info" ON public.itam_company_info FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE itam_company_info" ON public.itam_company_info FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_email_config
DROP POLICY IF EXISTS "Authenticated ALL" ON public.itam_email_config;
DROP POLICY IF EXISTS "auth_all" ON public.itam_email_config;
CREATE POLICY "Authenticated SELECT itam_email_config" ON public.itam_email_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT itam_email_config" ON public.itam_email_config FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE itam_email_config" ON public.itam_email_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_settings
DROP POLICY IF EXISTS "Authenticated ALL" ON public.itam_settings;
DROP POLICY IF EXISTS "auth_all" ON public.itam_settings;
CREATE POLICY "Authenticated SELECT itam_settings" ON public.itam_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT itam_settings" ON public.itam_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE itam_settings" ON public.itam_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_tag_format
DROP POLICY IF EXISTS "Authenticated ALL" ON public.itam_tag_format;
DROP POLICY IF EXISTS "auth_all" ON public.itam_tag_format;
CREATE POLICY "Authenticated SELECT itam_tag_format" ON public.itam_tag_format FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT itam_tag_format" ON public.itam_tag_format FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE itam_tag_format" ON public.itam_tag_format FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_tag_series
DROP POLICY IF EXISTS "Authenticated ALL" ON public.itam_tag_series;
DROP POLICY IF EXISTS "auth_all" ON public.itam_tag_series;
CREATE POLICY "Authenticated SELECT itam_tag_series" ON public.itam_tag_series FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT itam_tag_series" ON public.itam_tag_series FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE itam_tag_series" ON public.itam_tag_series FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- category_tag_formats
DROP POLICY IF EXISTS "Authenticated ALL" ON public.category_tag_formats;
CREATE POLICY "Authenticated SELECT category_tag_formats" ON public.category_tag_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT category_tag_formats" ON public.category_tag_formats FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE category_tag_formats" ON public.category_tag_formats FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- helpdesk_automation_rules
DROP POLICY IF EXISTS "Authenticated ALL automation_rules" ON public.helpdesk_automation_rules;
CREATE POLICY "Authenticated SELECT helpdesk_automation_rules" ON public.helpdesk_automation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT helpdesk_automation_rules" ON public.helpdesk_automation_rules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE helpdesk_automation_rules" ON public.helpdesk_automation_rules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin DELETE helpdesk_automation_rules" ON public.helpdesk_automation_rules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- helpdesk_sla_policies
DROP POLICY IF EXISTS "Authenticated ALL sla_policies" ON public.helpdesk_sla_policies;
CREATE POLICY "Authenticated SELECT helpdesk_sla_policies" ON public.helpdesk_sla_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT helpdesk_sla_policies" ON public.helpdesk_sla_policies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE helpdesk_sla_policies" ON public.helpdesk_sla_policies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- helpdesk_queues
DROP POLICY IF EXISTS "Authenticated ALL helpdesk_queues" ON public.helpdesk_queues;
CREATE POLICY "Authenticated SELECT helpdesk_queues" ON public.helpdesk_queues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT helpdesk_queues" ON public.helpdesk_queues FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE helpdesk_queues" ON public.helpdesk_queues FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin DELETE helpdesk_queues" ON public.helpdesk_queues FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- helpdesk_queue_members
DROP POLICY IF EXISTS "Authenticated ALL queue_members" ON public.helpdesk_queue_members;
CREATE POLICY "Authenticated SELECT helpdesk_queue_members" ON public.helpdesk_queue_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin INSERT helpdesk_queue_members" ON public.helpdesk_queue_members FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin UPDATE helpdesk_queue_members" ON public.helpdesk_queue_members FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin DELETE helpdesk_queue_members" ON public.helpdesk_queue_members FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- helpdesk_categories
DROP POLICY IF EXISTS "Authenticated ALL helpdesk_categories" ON public.helpdesk_categories;
CREATE POLICY "Authenticated SELECT helpdesk_categories" ON public.helpdesk_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT helpdesk_categories" ON public.helpdesk_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE helpdesk_categories" ON public.helpdesk_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE helpdesk_categories" ON public.helpdesk_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- helpdesk_kb_categories
DROP POLICY IF EXISTS "Authenticated ALL kb_categories" ON public.helpdesk_kb_categories;
CREATE POLICY "Authenticated SELECT helpdesk_kb_categories" ON public.helpdesk_kb_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT helpdesk_kb_categories" ON public.helpdesk_kb_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE helpdesk_kb_categories" ON public.helpdesk_kb_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- helpdesk_ticket_templates
DROP POLICY IF EXISTS "Authenticated ALL" ON public.helpdesk_ticket_templates;
CREATE POLICY "Authenticated SELECT helpdesk_ticket_templates" ON public.helpdesk_ticket_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT helpdesk_ticket_templates" ON public.helpdesk_ticket_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE helpdesk_ticket_templates" ON public.helpdesk_ticket_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE helpdesk_ticket_templates" ON public.helpdesk_ticket_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_categories
DROP POLICY IF EXISTS "Authenticated ALL" ON public.itam_categories;
CREATE POLICY "Authenticated SELECT itam_categories" ON public.itam_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_categories" ON public.itam_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_categories" ON public.itam_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE itam_categories" ON public.itam_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_departments
DROP POLICY IF EXISTS "Authenticated ALL" ON public.itam_departments;
CREATE POLICY "Authenticated SELECT itam_departments" ON public.itam_departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_departments" ON public.itam_departments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_departments" ON public.itam_departments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- itam_depreciation_profiles
DROP POLICY IF EXISTS "Authenticated users can manage depreciation profiles" ON public.itam_depreciation_profiles;
CREATE POLICY "Authenticated SELECT itam_depreciation_profiles" ON public.itam_depreciation_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_depreciation_profiles" ON public.itam_depreciation_profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_depreciation_profiles" ON public.itam_depreciation_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE itam_depreciation_profiles" ON public.itam_depreciation_profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PART C: Tighten user management tables

-- users table
DROP POLICY IF EXISTS "Authenticated users can insert users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON public.users;
CREATE POLICY "Admin INSERT users" ON public.users FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin or Self UPDATE users" ON public.users FOR UPDATE TO authenticated USING (auth_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin DELETE users" ON public.users FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles table
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;
CREATE POLICY "Users INSERT own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users UPDATE own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- PART D: Tighten remaining config tables

-- system_update_alerts
DROP POLICY IF EXISTS "Authenticated ALL" ON public.system_update_alerts;
DROP POLICY IF EXISTS "auth_all" ON public.system_update_alerts;
CREATE POLICY "Authenticated SELECT system_update_alerts" ON public.system_update_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT system_update_alerts" ON public.system_update_alerts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE system_update_alerts" ON public.system_update_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- system_update_ingest_logs
DROP POLICY IF EXISTS "Authenticated ALL" ON public.system_update_ingest_logs;
DROP POLICY IF EXISTS "auth_all" ON public.system_update_ingest_logs;
CREATE POLICY "Authenticated SELECT system_update_ingest_logs" ON public.system_update_ingest_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT system_update_ingest_logs" ON public.system_update_ingest_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- system_installed_updates
DROP POLICY IF EXISTS "auth_all" ON public.system_installed_updates;
CREATE POLICY "Authenticated SELECT system_installed_updates" ON public.system_installed_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT system_installed_updates" ON public.system_installed_updates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE system_installed_updates" ON public.system_installed_updates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- system_pending_updates
DROP POLICY IF EXISTS "auth_all" ON public.system_pending_updates;
CREATE POLICY "Authenticated SELECT system_pending_updates" ON public.system_pending_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT system_pending_updates" ON public.system_pending_updates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE system_pending_updates" ON public.system_pending_updates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- system_update_history
DROP POLICY IF EXISTS "auth_all" ON public.system_update_history;
CREATE POLICY "Authenticated SELECT system_update_history" ON public.system_update_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT system_update_history" ON public.system_update_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- itam_maintenance_schedules
DROP POLICY IF EXISTS "Authenticated ALL" ON public.itam_maintenance_schedules;
DROP POLICY IF EXISTS "auth_all" ON public.itam_maintenance_schedules;
CREATE POLICY "Authenticated SELECT itam_maintenance_schedules" ON public.itam_maintenance_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_maintenance_schedules" ON public.itam_maintenance_schedules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_maintenance_schedules" ON public.itam_maintenance_schedules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE itam_maintenance_schedules" ON public.itam_maintenance_schedules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- itam_purchase_orders
DROP POLICY IF EXISTS "Authenticated ALL" ON public.itam_purchase_orders;
DROP POLICY IF EXISTS "auth_all" ON public.itam_purchase_orders;
CREATE POLICY "Authenticated SELECT itam_purchase_orders" ON public.itam_purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_purchase_orders" ON public.itam_purchase_orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_purchase_orders" ON public.itam_purchase_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- subscriptions_reminders
DROP POLICY IF EXISTS "auth_all" ON public.subscriptions_reminders;
CREATE POLICY "Authenticated SELECT subscriptions_reminders" ON public.subscriptions_reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT subscriptions_reminders" ON public.subscriptions_reminders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE subscriptions_reminders" ON public.subscriptions_reminders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE subscriptions_reminders" ON public.subscriptions_reminders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- monitor_data
DROP POLICY IF EXISTS "auth_all" ON public.monitor_data;
CREATE POLICY "Authenticated SELECT monitor_data" ON public.monitor_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT monitor_data" ON public.monitor_data FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- itam_locations
DROP POLICY IF EXISTS "auth_all" ON public.itam_locations;
CREATE POLICY "Authenticated SELECT itam_locations" ON public.itam_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_locations" ON public.itam_locations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_locations" ON public.itam_locations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- itam_makes
DROP POLICY IF EXISTS "auth_all" ON public.itam_makes;
CREATE POLICY "Authenticated SELECT itam_makes" ON public.itam_makes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_makes" ON public.itam_makes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_makes" ON public.itam_makes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- itam_vendors
DROP POLICY IF EXISTS "auth_all" ON public.itam_vendors;
CREATE POLICY "Authenticated SELECT itam_vendors" ON public.itam_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_vendors" ON public.itam_vendors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_vendors" ON public.itam_vendors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- itam_sites
DROP POLICY IF EXISTS "auth_all" ON public.itam_sites;
CREATE POLICY "Authenticated SELECT itam_sites" ON public.itam_sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_sites" ON public.itam_sites FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_sites" ON public.itam_sites FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- itam_repairs
DROP POLICY IF EXISTS "auth_all" ON public.itam_repairs;
CREATE POLICY "Authenticated SELECT itam_repairs" ON public.itam_repairs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_repairs" ON public.itam_repairs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_repairs" ON public.itam_repairs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- itam_licenses
DROP POLICY IF EXISTS "auth_all" ON public.itam_licenses;
CREATE POLICY "Authenticated SELECT itam_licenses" ON public.itam_licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_licenses" ON public.itam_licenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_licenses" ON public.itam_licenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- itam_license_allocations
DROP POLICY IF EXISTS "auth_all" ON public.itam_license_allocations;
CREATE POLICY "Authenticated SELECT itam_license_allocations" ON public.itam_license_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Mgr INSERT itam_license_allocations" ON public.itam_license_allocations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin/Mgr UPDATE itam_license_allocations" ON public.itam_license_allocations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin DELETE itam_license_allocations" ON public.itam_license_allocations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
