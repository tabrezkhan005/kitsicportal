-- Minutes of Meeting (MOM) assignment and attachment per meeting

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS mom_assignee_id UUID REFERENCES users(id);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS mom_file_url TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS mom_file_name TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS mom_uploaded_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS mom_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS meetings_mom_assignee_idx ON meetings (mom_assignee_id);
