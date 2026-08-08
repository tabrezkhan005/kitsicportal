-- Google Meet integration + automated attendance tracking

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS google_meet_code TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS conference_record_name TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS attendance_synced_at TIMESTAMPTZ;

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS attendance_user_meeting_unique
  ON attendance_records (user_id, meeting_id)
  WHERE meeting_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS meetings_google_meet_code_idx ON meetings (google_meet_code);
CREATE INDEX IF NOT EXISTS attendance_meeting_idx ON attendance_records (meeting_id);
