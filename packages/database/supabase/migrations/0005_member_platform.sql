-- Member platform: signup fields, proposals, skills, learning, resources, messaging, OTP

CREATE SEQUENCE IF NOT EXISTS member_id_seq START 1;

ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS member_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#033565';
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS users_roll_number_idx ON users(roll_number) WHERE roll_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_member_id_idx ON users(member_id) WHERE member_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  seq_val := nextval('member_id_seq');
  RETURN 'IC' || lpad(seq_val::text, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- OTP pending signups
CREATE TABLE IF NOT EXISTS email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps(email);

-- Event proposals
CREATE TABLE IF NOT EXISTS event_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  proposed_starts_at TIMESTAMPTZ,
  proposed_ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  proposed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_proposal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_proposals_status_idx ON event_proposals(status);

-- Learning modules (quizzes & assignments)
CREATE TABLE IF NOT EXISTS learning_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('quiz', 'assignment')),
  questions JSONB NOT NULL DEFAULT '[]',
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, user_id)
);

-- Resources (internships, roadmaps, links)
CREATE TABLE IF NOT EXISTS club_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS club_resources_category_idx ON club_resources(category);

-- Leadership messaging (Gen 4: president, VP, secretary, treasurer)
CREATE TABLE IF NOT EXISTS leadership_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leadership_messages_recipient_idx ON leadership_messages(recipient_role);
CREATE INDEX IF NOT EXISTS leadership_messages_sender_idx ON leadership_messages(sender_id);

-- Meetings: track online/offline for attendance analytics
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'meetings'
  ) THEN
    ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_mode TEXT DEFAULT 'online';
  END IF;
END $$;

-- Updated signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  member_role_id UUID;
  meta JSONB;
BEGIN
  meta := NEW.raw_user_meta_data;
  INSERT INTO public.users (
    id, email, full_name, avatar_url, phone, roll_number, branch, member_id, avatar_color, bio
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'full_name', meta->>'name'),
    meta->>'avatar_url',
    meta->>'phone',
    meta->>'roll_number',
    meta->>'branch',
    COALESCE(meta->>'member_id', public.generate_member_id()),
    COALESCE(meta->>'avatar_color', '#033565'),
    CASE
      WHEN meta->>'roll_number' IS NOT NULL AND meta->>'branch' IS NOT NULL
      THEN 'Roll No: ' || (meta->>'roll_number') || ' · ' || (meta->>'branch')
      ELSE NULL
    END
  );

  SELECT id INTO member_role_id FROM public.roles WHERE slug = 'member' LIMIT 1;
  IF member_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, member_role_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill member IDs for existing users
UPDATE users SET member_id = public.generate_member_id() WHERE member_id IS NULL;
