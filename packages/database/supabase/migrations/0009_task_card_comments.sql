-- Task card comments for club board collaboration

CREATE TABLE IF NOT EXISTS task_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES task_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_card_comments_card_idx ON task_card_comments(card_id);
CREATE INDEX IF NOT EXISTS task_card_comments_user_idx ON task_card_comments(user_id);

ALTER TABLE task_card_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'task_card_comments' AND policyname = 'task_card_comments_service_all'
  ) THEN
    CREATE POLICY task_card_comments_service_all ON task_card_comments
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TRIGGER task_card_comments_updated_at
  BEFORE UPDATE ON task_card_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
