-- Add missing columns to helpdesk_tickets table
ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS resolution_summary TEXT;
ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS merged_into_id BIGINT REFERENCES helpdesk_tickets(id);
ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0;
ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT FALSE;

-- Create Canned Responses table
CREATE TABLE IF NOT EXISTS helpdesk_canned_responses (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id),
  organisation_id UUID REFERENCES organisations(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id BIGINT REFERENCES helpdesk_categories(id),
  is_public BOOLEAN DEFAULT true,
  shortcut TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Time Entries table for time tracking
CREATE TABLE IF NOT EXISTS helpdesk_time_entries (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  description TEXT,
  is_billable BOOLEAN DEFAULT false,
  work_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Ticket Watchers table
CREATE TABLE IF NOT EXISTS helpdesk_ticket_watchers (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(ticket_id, user_id)
);

-- Create CSAT Ratings table
CREATE TABLE IF NOT EXISTS helpdesk_csat_ratings (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT REFERENCES helpdesk_tickets(id) ON DELETE CASCADE UNIQUE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  submitted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Saved Views table
CREATE TABLE IF NOT EXISTS helpdesk_saved_views (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  organisation_id UUID REFERENCES organisations(id),
  name TEXT NOT NULL,
  filters JSONB,
  is_shared BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Ticket Templates table
CREATE TABLE IF NOT EXISTS helpdesk_ticket_templates (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id),
  organisation_id UUID REFERENCES organisations(id),
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  category_id BIGINT REFERENCES helpdesk_categories(id),
  form_fields JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE helpdesk_canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk_ticket_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk_csat_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk_saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk_ticket_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for canned responses
CREATE POLICY "Users can view canned responses in their org" ON helpdesk_canned_responses
  FOR SELECT USING (organisation_id = auth_organisation_id() OR is_public = true);

CREATE POLICY "Users can create canned responses in their org" ON helpdesk_canned_responses
  FOR INSERT WITH CHECK (organisation_id = auth_organisation_id());

CREATE POLICY "Users can update their own canned responses" ON helpdesk_canned_responses
  FOR UPDATE USING (created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own canned responses" ON helpdesk_canned_responses
  FOR DELETE USING (created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- RLS Policies for time entries
CREATE POLICY "Users can view time entries in their org" ON helpdesk_time_entries
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM helpdesk_tickets WHERE organisation_id = auth_organisation_id())
  );

CREATE POLICY "Users can create time entries" ON helpdesk_time_entries
  FOR INSERT WITH CHECK (
    ticket_id IN (SELECT id FROM helpdesk_tickets WHERE organisation_id = auth_organisation_id())
  );

CREATE POLICY "Users can update their own time entries" ON helpdesk_time_entries
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own time entries" ON helpdesk_time_entries
  FOR DELETE USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- RLS Policies for ticket watchers
CREATE POLICY "Users can view watchers for tickets in their org" ON helpdesk_ticket_watchers
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM helpdesk_tickets WHERE organisation_id = auth_organisation_id())
  );

CREATE POLICY "Users can add watchers to tickets in their org" ON helpdesk_ticket_watchers
  FOR INSERT WITH CHECK (
    ticket_id IN (SELECT id FROM helpdesk_tickets WHERE organisation_id = auth_organisation_id())
  );

CREATE POLICY "Users can remove themselves as watchers" ON helpdesk_ticket_watchers
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
    added_by = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- RLS Policies for CSAT ratings
CREATE POLICY "Users can view CSAT ratings for tickets in their org" ON helpdesk_csat_ratings
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM helpdesk_tickets WHERE organisation_id = auth_organisation_id())
  );

CREATE POLICY "Users can submit CSAT ratings" ON helpdesk_csat_ratings
  FOR INSERT WITH CHECK (
    ticket_id IN (SELECT id FROM helpdesk_tickets WHERE organisation_id = auth_organisation_id())
  );

-- RLS Policies for saved views
CREATE POLICY "Users can view their own saved views and shared views" ON helpdesk_saved_views
  FOR SELECT USING (
    user_id = auth.uid() OR 
    (is_shared = true AND organisation_id = auth_organisation_id())
  );

CREATE POLICY "Users can create saved views" ON helpdesk_saved_views
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own saved views" ON helpdesk_saved_views
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own saved views" ON helpdesk_saved_views
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for ticket templates
CREATE POLICY "Users can view templates in their org" ON helpdesk_ticket_templates
  FOR SELECT USING (organisation_id = auth_organisation_id());

CREATE POLICY "Users can create templates in their org" ON helpdesk_ticket_templates
  FOR INSERT WITH CHECK (organisation_id = auth_organisation_id());

CREATE POLICY "Admins can update templates" ON helpdesk_ticket_templates
  FOR UPDATE USING (organisation_id = auth_organisation_id());

CREATE POLICY "Admins can delete templates" ON helpdesk_ticket_templates
  FOR DELETE USING (organisation_id = auth_organisation_id());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_ticket ON helpdesk_time_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON helpdesk_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_watchers_ticket ON helpdesk_ticket_watchers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_csat_ticket ON helpdesk_csat_ratings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_user ON helpdesk_saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_org ON helpdesk_ticket_templates(organisation_id);