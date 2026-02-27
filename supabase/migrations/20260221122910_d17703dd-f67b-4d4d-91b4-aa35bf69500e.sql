-- Add unique constraint on users.auth_user_id so the handle_new_auth_user trigger's
-- ON CONFLICT clause works correctly. Without this, every user creation fails.
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique 
ON public.users (auth_user_id) 
WHERE auth_user_id IS NOT NULL;