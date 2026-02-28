
-- Update checkout template: remove redundant fields, clean body, fix sign-off
UPDATE itam_email_config
SET config_value = jsonb_build_object(
  'subject', 'Asset Checked Out: {{asset_tag}}',
  'body', E'Hello {{user_name}},\n\nThis is a confirmation email. The following items are in your possession:\n\nNotes: {{notes}}\n\nThank you.\n\nBest regards,\nIT Team',
  'enabled', true
),
updated_at = now()
WHERE config_type = 'template' AND config_key = 'checkout';

-- Update checkin template: remove redundant fields, clean body, fix sign-off
UPDATE itam_email_config
SET config_value = jsonb_build_object(
  'subject', 'Asset Returned: {{asset_tag}}',
  'body', E'Hello {{user_name}},\n\nThis is a confirmation email. The following items have been returned:\n\nNotes: {{notes}}\n\nThank you.\n\nBest regards,\nIT Team',
  'enabled', true
),
updated_at = now()
WHERE config_type = 'template' AND config_key = 'checkin';

-- Update sign-off for all other templates
UPDATE itam_email_config
SET config_value = jsonb_set(
  config_value,
  '{body}',
  to_jsonb(replace(config_value->>'body', 'IT Asset Management Team', 'IT Team'))
),
updated_at = now()
WHERE config_type = 'template'
AND config_key NOT IN ('checkout', 'checkin')
AND config_value->>'body' LIKE '%IT Asset Management Team%';
