-- Trello-style task boards + club whiteboard (public to all authenticated users)

CREATE TABLE IF NOT EXISTS task_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  background_color TEXT NOT NULL DEFAULT '#0079bf',
  created_by UUID REFERENCES users(id),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ,
  cover_color TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#faa109',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_card_labels (
  card_id UUID NOT NULL REFERENCES task_cards(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE TABLE IF NOT EXISTS task_card_members (
  card_id UUID NOT NULL REFERENCES task_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES task_cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Checklist',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES task_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES task_cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_whiteboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Club Whiteboard',
  scene_data JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_lists_board_idx ON task_lists(board_id);
CREATE INDEX IF NOT EXISTS task_cards_list_idx ON task_cards(list_id);
CREATE INDEX IF NOT EXISTS task_cards_board_idx ON task_cards(board_id);
CREATE INDEX IF NOT EXISTS task_labels_board_idx ON task_labels(board_id);

ALTER TABLE task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_card_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_whiteboards ENABLE ROW LEVEL SECURITY;

-- All authenticated club members can read and write (public club workspace)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'task_boards', 'task_lists', 'task_cards', 'task_labels', 'task_card_labels',
    'task_card_members', 'task_checklists', 'task_checklist_items', 'task_attachments', 'club_whiteboards'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_all ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_all ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

CREATE TRIGGER task_boards_updated_at BEFORE UPDATE ON task_boards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER task_lists_updated_at BEFORE UPDATE ON task_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER task_cards_updated_at BEFORE UPDATE ON task_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER club_whiteboards_updated_at BEFORE UPDATE ON club_whiteboards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default club board + lists
INSERT INTO task_boards (id, name, description, background_color, position)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Innovation Club Board',
  'Shared club task board — visible and editable by all members',
  '#033565',
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO task_lists (id, board_id, name, position)
SELECT * FROM (VALUES
  ('a0000000-0000-0000-0000-000000000011'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'To Do', 0),
  ('a0000000-0000-0000-0000-000000000012'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'In Progress', 1),
  ('a0000000-0000-0000-0000-000000000013'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Under Review', 2),
  ('a0000000-0000-0000-0000-000000000014'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Done', 3)
) AS v(id, board_id, name, position)
WHERE NOT EXISTS (SELECT 1 FROM task_lists WHERE board_id = 'a0000000-0000-0000-0000-000000000001');

INSERT INTO task_labels (id, board_id, name, color)
SELECT * FROM (VALUES
  ('a0000000-0000-0000-0000-000000000021'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Technical', '#0079bf'),
  ('a0000000-0000-0000-0000-000000000022'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Design', '#c377e0'),
  ('a0000000-0000-0000-0000-000000000023'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Logistics', '#ff9f1a'),
  ('a0000000-0000-0000-0000-000000000024'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Marketing', '#61bd4f'),
  ('a0000000-0000-0000-0000-000000000025'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Urgent', '#eb5a46')
) AS v(id, board_id, name, color)
WHERE NOT EXISTS (SELECT 1 FROM task_labels WHERE board_id = 'a0000000-0000-0000-0000-000000000001');

INSERT INTO club_whiteboards (id, name, scene_data)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Club Whiteboard',
  '{"elements":[],"appState":{"viewBackgroundColor":"#fefefe"},"files":{}}'
) ON CONFLICT (id) DO NOTHING;
