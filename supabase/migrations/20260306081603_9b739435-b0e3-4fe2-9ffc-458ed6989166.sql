
-- Drop the existing check constraint and add terminated as valid status
ALTER TABLE public.users DROP CONSTRAINT users_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'terminated'::text]));

-- Insert 5 missing terminated users
INSERT INTO public.users (name, email, status, role) VALUES
  ('Dnyaneshwar Mali', 'dnyaneshwar.mali@realthingks.com', 'terminated', 'employee'),
  ('Rutvik Kalariya', 'rutvik.kalariya@realthingks.com', 'terminated', 'employee'),
  ('Sankarshan Manavi', 'sankarshan.manavi@realthingks.com', 'terminated', 'employee'),
  ('Venkatesh Pinninti', 'venkatesh.pinninti@realthingks.com', 'terminated', 'employee'),
  ('Vipul Lanjewar', 'vipul.lanjewar@realthingks.com', 'terminated', 'employee');

-- Update 4 existing users to terminated
UPDATE public.users SET status = 'terminated', updated_at = NOW()
WHERE email IN (
  'dilip.jangid@realthingks.com',
  'siva.prasad@realthingks.com',
  'pratik.wable@realthingks.com',
  'ramakrishna.tondapu@realthingks.com'
);
