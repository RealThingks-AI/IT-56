-- Drop the existing check constraint that's causing issues
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;

-- Add a new check constraint with the correct status values
ALTER TABLE users ADD CONSTRAINT users_status_check 
CHECK (status IN ('active', 'inactive', 'suspended'));