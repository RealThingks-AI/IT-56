DROP INDEX IF EXISTS public.users_auth_user_id_unique;
DROP INDEX IF EXISTS public.idx_users_auth_user_id;
ALTER TABLE public.users ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);