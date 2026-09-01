-- Leadership roles expansion + invite codes for head registration

INSERT INTO roles (slug, name, hierarchy_level) VALUES
  ('joint_secretary', 'Joint Secretary', 75),
  ('finance_head', 'Finance Head', 80),
  ('literature_head', 'Literature Head', 70),
  ('entrepreneurship_head', 'Entrepreneurship Head', 70),
  ('digital_media_head', 'Digital Media Head', 70),
  ('hospitality_head', 'Hospitality Head', 70)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  hierarchy_level = EXCLUDED.hierarchy_level;

UPDATE roles SET name = 'Digital Media Head' WHERE slug = 'social_media_head';

-- Migrate treasurer → finance_head where finance_head exists
DO $$
DECLARE
  treasurer_id UUID;
  finance_id UUID;
BEGIN
  SELECT id INTO treasurer_id FROM roles WHERE slug = 'treasurer' LIMIT 1;
  SELECT id INTO finance_id FROM roles WHERE slug = 'finance_head' LIMIT 1;
  IF treasurer_id IS NOT NULL AND finance_id IS NOT NULL THEN
    UPDATE user_roles SET role_id = finance_id WHERE role_id = treasurer_id
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur2
        WHERE ur2.user_id = user_roles.user_id AND ur2.role_id = finance_id
      );
  END IF;
END $$;

-- Migrate social_media_head → digital_media_head
DO $$
DECLARE
  old_id UUID;
  new_id UUID;
BEGIN
  SELECT id INTO old_id FROM roles WHERE slug = 'social_media_head' LIMIT 1;
  SELECT id INTO new_id FROM roles WHERE slug = 'digital_media_head' LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL THEN
    UPDATE user_roles SET role_id = new_id WHERE role_id = old_id
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur2
        WHERE ur2.user_id = user_roles.user_id AND ur2.role_id = new_id
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS leadership_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_slug TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL DEFAULT 3,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leadership_invite_codes_role_idx ON leadership_invite_codes(role_slug);

ALTER TABLE leadership_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leadership_invite_codes_service ON leadership_invite_codes;
CREATE POLICY leadership_invite_codes_service ON leadership_invite_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Default invite codes (share with each head — rotate after registration)
INSERT INTO leadership_invite_codes (role_slug, code, max_uses) VALUES
  ('president', 'KITSIC-PRES-26', 2),
  ('vice_president', 'KITSIC-VP-26', 3),
  ('secretary', 'KITSIC-SEC-26', 3),
  ('joint_secretary', 'KITSIC-JSEC-26', 3),
  ('student_lead', 'KITSIC-SL-26', 5),
  ('finance_head', 'KITSIC-FIN-26', 3),
  ('resource_head', 'KITSIC-RES-26', 3),
  ('logistics_head', 'KITSIC-LOG-26', 3),
  ('literature_head', 'KITSIC-LIT-26', 3),
  ('entrepreneurship_head', 'KITSIC-ENT-26', 3),
  ('technical_head', 'KITSIC-TECH-26', 5),
  ('digital_media_head', 'KITSIC-MEDIA-26', 5),
  ('hospitality_head', 'KITSIC-HOSP-26', 3)
ON CONFLICT (code) DO NOTHING;
