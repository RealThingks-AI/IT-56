ALTER TABLE itam_repairs DROP CONSTRAINT itam_repairs_status_check;
ALTER TABLE itam_repairs ADD CONSTRAINT itam_repairs_status_check 
  CHECK (status = ANY (ARRAY['open', 'pending', 'in_progress', 'completed', 'cancelled']));