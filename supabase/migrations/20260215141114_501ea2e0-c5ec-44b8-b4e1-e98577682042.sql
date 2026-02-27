
-- Nullify ALL blocking FK references to orphan users BEFORE deleting them
-- (constraints without ON DELETE SET NULL/CASCADE will block the delete)

-- itam_assets.checked_out_to
UPDATE itam_assets SET checked_out_to = NULL 
WHERE checked_out_to IS NOT NULL 
AND checked_out_to NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- itam_assets.assigned_to
UPDATE itam_assets SET assigned_to = NULL 
WHERE assigned_to IS NOT NULL 
AND assigned_to NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- itam_asset_reservations.reserved_for
UPDATE itam_asset_reservations SET reserved_for = NULL 
WHERE reserved_for IS NOT NULL 
AND reserved_for NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- itam_maintenance_schedules.assigned_to
UPDATE itam_maintenance_schedules SET assigned_to = NULL 
WHERE assigned_to IS NOT NULL 
AND assigned_to NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- helpdesk_canned_responses.created_by
UPDATE helpdesk_canned_responses SET created_by = NULL 
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- helpdesk_time_entries.user_id
UPDATE helpdesk_time_entries SET user_id = NULL 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- helpdesk_ticket_watchers (delete orphan rows since both columns are FK)
DELETE FROM helpdesk_ticket_watchers 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

UPDATE helpdesk_ticket_watchers SET added_by = NULL 
WHERE added_by IS NOT NULL 
AND added_by NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- helpdesk_csat_ratings.submitted_by
UPDATE helpdesk_csat_ratings SET submitted_by = NULL 
WHERE submitted_by IS NOT NULL 
AND submitted_by NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- helpdesk_saved_views.user_id
UPDATE helpdesk_saved_views SET user_id = NULL 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- helpdesk_ticket_templates.created_by
UPDATE helpdesk_ticket_templates SET created_by = NULL 
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT id FROM users WHERE auth_user_id IN ('fb1a6eb8-79bc-470a-95a4-8cb00bd96248','36d93493-5970-4600-b407-19c43e53c34c'));

-- Now delete orphan users (CASCADE/SET NULL FKs will auto-handle the rest)
DELETE FROM users 
WHERE auth_user_id NOT IN (
  'fb1a6eb8-79bc-470a-95a4-8cb00bd96248',
  '36d93493-5970-4600-b407-19c43e53c34c'
);

-- Delete orphan profiles
DELETE FROM profiles 
WHERE id NOT IN (
  'fb1a6eb8-79bc-470a-95a4-8cb00bd96248',
  '36d93493-5970-4600-b407-19c43e53c34c'
);
