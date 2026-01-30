-- Consolidate duplicate user: deepak.dongare@realthingks.com
-- Keep the most recently active: 470495bd-7372-4846-b437-711d0ed89b9f (org: fc8be2fb...)
-- Remove the older: ec516c89-ad99-4101-9d10-c263754faf47 (org: 28374dab...)

-- Step 1: Update any references to the old user ID to point to the new user ID
-- Update itam_asset_assignments
UPDATE public.itam_asset_assignments 
SET assigned_to = '470495bd-7372-4846-b437-711d0ed89b9f'
WHERE assigned_to = 'ec516c89-ad99-4101-9d10-c263754faf47';

-- Update helpdesk_tickets (assignee_id references users.id)
UPDATE public.helpdesk_tickets 
SET assignee_id = '470495bd-7372-4846-b437-711d0ed89b9f'
WHERE assignee_id = 'ec516c89-ad99-4101-9d10-c263754faf47';

-- Update helpdesk_problems (assigned_to, created_by - these use auth_user_id)
UPDATE public.helpdesk_problems 
SET assigned_to = 'fb1a6eb8-79bc-470a-95a4-8cb00bd96248'
WHERE assigned_to = '35bde2fb-7602-42e4-b059-0fd65a4c8fec';

UPDATE public.helpdesk_problems 
SET created_by = 'fb1a6eb8-79bc-470a-95a4-8cb00bd96248'
WHERE created_by = '35bde2fb-7602-42e4-b059-0fd65a4c8fec';

-- Step 2: Mark the duplicate user as inactive and modify email to allow unique constraint
UPDATE public.users 
SET status = 'inactive', 
    email = 'MERGED_' || id || '_deepak.dongare@realthingks.com'
WHERE id = 'ec516c89-ad99-4101-9d10-c263754faf47';

-- Step 3: Now create the unique index on active users only
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_active_idx 
ON public.users (email) 
WHERE status = 'active';

-- Add comment explaining the constraint
COMMENT ON INDEX users_email_unique_active_idx IS 'Prevents duplicate email addresses for active users';