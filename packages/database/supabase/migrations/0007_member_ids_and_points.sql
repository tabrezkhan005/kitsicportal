-- Member IDs: IC01, IC02 format + learning points on submissions

CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  seq_val := nextval('member_id_seq');
  RETURN 'IC' || lpad(seq_val::text, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- Backfill existing users with IC codes ordered by join date
DO $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN SELECT id FROM public.users ORDER BY created_at ASC LOOP
    n := n + 1;
    UPDATE public.users SET member_id = 'IC' || lpad(n::text, 2, '0') WHERE id = r.id;
  END LOOP;
  IF n > 0 THEN
    PERFORM setval('member_id_seq', n);
  END IF;
END $$;

ALTER TABLE learning_submissions ADD COLUMN IF NOT EXISTS points_earned INTEGER NOT NULL DEFAULT 0;

-- Award points for existing quiz submissions (score = percentage → points)
UPDATE learning_submissions
SET points_earned = CASE
  WHEN score IS NOT NULL THEN LEAST(100, score) + CASE WHEN score = 100 THEN 25 ELSE 0 END
  ELSE 40
END
WHERE points_earned = 0;
