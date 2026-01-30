-- Drop old SRM tables and related objects
DROP TABLE IF EXISTS srm_request_approvals CASCADE;
DROP TABLE IF EXISTS srm_request_comments CASCADE;
DROP TABLE IF EXISTS srm_requests CASCADE;
DROP TABLE IF EXISTS srm_catalog CASCADE;
DROP TABLE IF EXISTS srm_assignment_rules CASCADE;
DROP TABLE IF EXISTS change_approvals CASCADE;
DROP TABLE IF EXISTS change_calendar CASCADE;
DROP TABLE IF EXISTS change_requests CASCADE;

-- Drop any SRM-related functions
DROP FUNCTION IF EXISTS generate_srm_request_number() CASCADE;