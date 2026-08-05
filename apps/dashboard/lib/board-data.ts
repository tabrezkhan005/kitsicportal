import { createAdminClient } from "@kitsic/database";

export interface BoardLabel {
  id: string;
  name: string;
  color: string;
}

export interface BoardMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
  position: number;
}

export interface Checklist {
  id: string;
  title: string;
  position: number;
  items: ChecklistItem[];
}

export interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
}

export interface BoardCard {
  id: string;
  list_id: string;
  board_id: string;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  cover_color: string | null;
  labels: BoardLabel[];
  members: BoardMember[];
  checklists: Checklist[];
  attachments: Attachment[];
}

export interface BoardList {
  id: string;
  name: string;
  position: number;
  cards: BoardCard[];
}

export interface TaskBoardFull {
  id: string;
  name: string;
  description: string | null;
  background_color: string;
  lists: BoardList[];
  labels: BoardLabel[];
}

export interface ClubMemberOption {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

const DEFAULT_BOARD_ID = "a0000000-0000-0000-0000-000000000001";

export async function getTaskBoards() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("task_boards")
    .select("id, name, description, background_color, position")
    .order("position", { ascending: true });
  return data ?? [];
}

export async function getTaskBoardFull(boardId?: string): Promise<TaskBoardFull | null> {
  const supabase = createAdminClient();
  const id = boardId ?? DEFAULT_BOARD_ID;

  const { data: board } = await supabase
    .from("task_boards")
    .select("id, name, description, background_color")
    .eq("id", id)
    .single();

  if (!board) return null;

  const [
    { data: lists },
    { data: cards },
    { data: labels },
    { data: cardLabels },
    { data: cardMembers },
  ] = await Promise.all([
    supabase.from("task_lists").select("id, name, position").eq("board_id", id).order("position"),
    supabase.from("task_cards").select("*").eq("board_id", id).is("deleted_at", null).order("position"),
    supabase.from("task_labels").select("id, name, color").eq("board_id", id).order("name"),
    supabase.from("task_card_labels").select("card_id, label_id"),
    supabase.from("task_card_members").select("card_id, user_id, users(full_name, avatar_url)"),
  ]);

  const cardIds = (cards ?? []).map((c) => c.id);
  const cardIdSet = new Set(cardIds);

  const filteredCardLabels = (cardLabels ?? []).filter((cl) => cardIdSet.has(cl.card_id));
  const filteredCardMembers = (cardMembers ?? []).filter((cm) => cardIdSet.has(cm.card_id));

  const [checklistsRes, attachmentsRes] = cardIds.length
    ? await Promise.all([
        supabase.from("task_checklists").select("*").in("card_id", cardIds).order("position"),
        supabase.from("task_attachments").select("*").in("card_id", cardIds).order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];

  const checklistIds = (checklistsRes.data ?? []).map((c) => c.id);

  const itemsRes = checklistIds.length
    ? await supabase.from("task_checklist_items").select("*").in("checklist_id", checklistIds).order("position")
    : { data: [] as ChecklistItem[] };
  const labelMap = new Map((labels ?? []).map((l) => [l.id, l]));
  const cardLabelMap = new Map<string, BoardLabel[]>();
  for (const cl of filteredCardLabels) {
    const label = labelMap.get(cl.label_id);
    if (!label) continue;
    const existing = cardLabelMap.get(cl.card_id) ?? [];
    existing.push(label);
    cardLabelMap.set(cl.card_id, existing);
  }

  const memberMap = new Map<string, BoardMember[]>();
  for (const cm of filteredCardMembers) {
    const raw = cm.users as { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
    const user = Array.isArray(raw) ? raw[0] : raw;
    const existing = memberMap.get(cm.card_id) ?? [];
    existing.push({
      user_id: cm.user_id,
      full_name: user?.full_name ?? null,
      avatar_url: user?.avatar_url ?? null,
    });
    memberMap.set(cm.card_id, existing);
  }

  const itemsByChecklist = new Map<string, ChecklistItem[]>();
  for (const item of itemsRes.data ?? []) {
    const existing = itemsByChecklist.get(item.checklist_id) ?? [];
    existing.push(item);
    itemsByChecklist.set(item.checklist_id, existing);
  }

  const checklistMap = new Map<string, Checklist[]>();
  for (const cl of checklistsRes.data ?? []) {
    const existing = checklistMap.get(cl.card_id) ?? [];
    existing.push({
      id: cl.id,
      title: cl.title,
      position: cl.position,
      items: itemsByChecklist.get(cl.id) ?? [],
    });
    checklistMap.set(cl.card_id, existing);
  }

  const attachmentMap = new Map<string, Attachment[]>();
  for (const att of attachmentsRes.data ?? []) {
    const existing = attachmentMap.get(att.card_id) ?? [];
    existing.push(att);
    attachmentMap.set(att.card_id, existing);
  }

  const enrichedCards: BoardCard[] = (cards ?? []).map((card) => ({
    id: card.id,
    list_id: card.list_id,
    board_id: card.board_id,
    title: card.title,
    description: card.description,
    position: card.position,
    due_date: card.due_date,
    cover_color: card.cover_color,
    labels: cardLabelMap.get(card.id) ?? [],
    members: memberMap.get(card.id) ?? [],
    checklists: checklistMap.get(card.id) ?? [],
    attachments: attachmentMap.get(card.id) ?? [],
  }));

  const listsWithCards: BoardList[] = (lists ?? []).map((list) => ({
    id: list.id,
    name: list.name,
    position: list.position,
    cards: enrichedCards.filter((c) => c.list_id === list.id).sort((a, b) => a.position - b.position),
  }));

  return {
    ...board,
    lists: listsWithCards,
    labels: labels ?? [],
  };
}

export async function getClubMembersForBoard(): Promise<ClubMemberOption[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url")
    .order("full_name");
  return data ?? [];
}

export async function getClubWhiteboard() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("club_whiteboards")
    .select("id, name, scene_data, updated_at")
    .order("created_at")
    .limit(1)
    .single();
  return data;
}

export async function getBoardCardStats() {
  const supabase = createAdminClient();
  const { data: cards } = await supabase
    .from("task_cards")
    .select("id, list_id, due_date, task_lists(name)")
    .is("deleted_at", null);

  const total = cards?.length ?? 0;
  const done = cards?.filter((c) => {
    const list = c.task_lists as { name: string } | { name: string }[] | null;
    const name = Array.isArray(list) ? list[0]?.name : list?.name;
    return name?.toLowerCase() === "done";
  }).length ?? 0;

  return {
    total,
    completed: done,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}
