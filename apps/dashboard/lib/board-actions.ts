"use server";

import { getSessionUser } from "@kitsic/auth";
import { createAdminClient, logAuditEvent } from "@kitsic/database";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { ActionResult } from "@/lib/actions";
import { createNotification } from "@/lib/notify";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function writeAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  newValue?: Record<string, unknown>,
) {
  const headerList = await headers();
  await logAuditEvent({
    userId,
    action,
    entityType,
    entityId,
    newValue,
    ipAddress: headerList.get("x-forwarded-for"),
    userAgent: headerList.get("user-agent"),
  });
}

function revalidateBoard() {
  revalidatePath("/tasks");
  revalidatePath("/");
}

function revalidateWhiteboard() {
  revalidatePath("/whiteboard");
}

// ─── Boards & Lists ──────────────────────────────────────────────────────────

export async function createBoard(name: string, description?: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("task_boards")
    .insert({ name, description: description ?? null, created_by: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const defaultLists = ["To Do", "In Progress", "Under Review", "Done"];
  await supabase.from("task_lists").insert(
    defaultLists.map((listName, i) => ({ board_id: data.id, name: listName, position: i })),
  );

  await writeAudit(user.id, "board.create", "task_board", data.id, { name });
  revalidateBoard();
  return { success: true, data: { id: data.id } };
}

export async function createList(boardId: string, name: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("task_lists")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1);

  const position = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("task_lists")
    .insert({ board_id: boardId, name, position })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "list.create", "task_list", data.id, { name, boardId });
  revalidateBoard();
  return { success: true, data: { id: data.id } };
}

export async function renameList(listId: string, name: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("task_lists").update({ name }).eq("id", listId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "list.rename", "task_list", listId, { name });
  revalidateBoard();
  return { success: true };
}

export async function deleteList(listId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("task_lists").delete().eq("id", listId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "list.delete", "task_list", listId);
  revalidateBoard();
  return { success: true };
}

// ─── Cards ───────────────────────────────────────────────────────────────────

export async function createCard(listId: string, boardId: string, title: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("task_cards")
    .select("position")
    .eq("list_id", listId)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1);

  const position = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("task_cards")
    .insert({
      list_id: listId,
      board_id: boardId,
      title,
      position,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await supabase.from("task_card_members").insert({ card_id: data.id, user_id: user.id });
  await writeAudit(user.id, "card.create", "task_card", data.id, { title });
  revalidateBoard();
  return { success: true, data: { id: data.id } };
}

export async function updateCard(
  cardId: string,
  updates: {
    title?: string;
    description?: string | null;
    due_date?: string | null;
    cover_color?: string | null;
    list_id?: string;
    position?: number;
  },
): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("task_cards").update(updates).eq("id", cardId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "card.update", "task_card", cardId, updates);
  revalidateBoard();
  return { success: true };
}

export async function moveCard(
  cardId: string,
  listId: string,
  position: number,
): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("task_cards")
    .update({ list_id: listId, position })
    .eq("id", cardId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "card.move", "task_card", cardId, { listId, position });
  revalidateBoard();
  return { success: true };
}

export async function deleteCard(cardId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("task_cards")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", cardId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "card.delete", "task_card", cardId);
  revalidateBoard();
  return { success: true };
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export async function createLabel(
  boardId: string,
  name: string,
  color: string,
): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("task_labels")
    .insert({ board_id: boardId, name, color })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await writeAudit(user.id, "label.create", "task_label", data.id, { name, color });
  revalidateBoard();
  return { success: true, data: { id: data.id } };
}

export async function updateLabel(
  labelId: string,
  updates: { name?: string; color?: string },
): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("task_labels").update(updates).eq("id", labelId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "label.update", "task_label", labelId, updates);
  revalidateBoard();
  return { success: true };
}

export async function deleteLabel(labelId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("task_labels").delete().eq("id", labelId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "label.delete", "task_label", labelId);
  revalidateBoard();
  return { success: true };
}

export async function toggleCardLabel(cardId: string, labelId: string, add: boolean): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();

  if (add) {
    const { error } = await supabase.from("task_card_labels").insert({ card_id: cardId, label_id: labelId });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("task_card_labels")
      .delete()
      .eq("card_id", cardId)
      .eq("label_id", labelId);
    if (error) return { error: error.message };
  }

  await writeAudit(user.id, "card.label", "task_card", cardId, { labelId, add });
  revalidateBoard();
  return { success: true };
}

// ─── Members ─────────────────────────────────────────────────────────────────

async function notifyCardAssignment(
  cardId: string,
  assigneeId: string,
  assignerId: string,
  assignerName: string | null,
) {
  if (assigneeId === assignerId) return;

  const supabase = createAdminClient();
  const { data: card } = await supabase.from("task_cards").select("title").eq("id", cardId).single();
  if (!card) return;

  await createNotification({
    userId: assigneeId,
    title: "Task assigned to you",
    message: `${assignerName ?? "A club member"} added you to "${card.title}" on the club board.`,
    type: "task",
  });
}

export async function toggleCardMember(cardId: string, userId: string, add: boolean): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();

  if (add) {
    const { error } = await supabase.from("task_card_members").insert({ card_id: cardId, user_id: userId });
    if (error) return { error: error.message };

    const { data: assigner } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single();
    await notifyCardAssignment(cardId, userId, user.id, assigner?.full_name ?? null);
  } else {
    const { error } = await supabase
      .from("task_card_members")
      .delete()
      .eq("card_id", cardId)
      .eq("user_id", userId);
    if (error) return { error: error.message };
  }

  await writeAudit(user.id, "card.member", "task_card", cardId, { userId, add });
  revalidateBoard();
  return { success: true };
}

// ─── Comments ────────────────────────────────────────────────────────────────

async function notifyCardComment(cardId: string, authorId: string, authorName: string | null, body: string) {
  const supabase = createAdminClient();
  const [{ data: card }, { data: members }] = await Promise.all([
    supabase.from("task_cards").select("title").eq("id", cardId).single(),
    supabase.from("task_card_members").select("user_id").eq("card_id", cardId),
  ]);

  if (!card) return;

  const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;
  const recipientIds = new Set((members ?? []).map((m) => m.user_id).filter((id) => id !== authorId));

  for (const recipientId of recipientIds) {
    await createNotification({
      userId: recipientId,
      title: `New comment on "${card.title}"`,
      message: `${authorName ?? "A club member"} commented: ${preview}`,
      type: "task",
      sendEmail: false,
    });
  }
}

export async function addCardComment(cardId: string, body: string): Promise<ActionResult> {
  const user = await requireAuth();
  const trimmed = body.trim();
  if (!trimmed) return { error: "Comment cannot be empty" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("task_card_comments")
    .insert({ card_id: cardId, user_id: user.id, body: trimmed })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await writeAudit(user.id, "card.comment.add", "task_card_comment", data.id, { cardId });
  await notifyCardComment(cardId, user.id, user.fullName ?? null, trimmed);
  revalidateBoard();
  return { success: true, data: { id: data.id } };
}

export async function deleteCardComment(commentId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("task_card_comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "card.comment.delete", "task_card_comment", commentId);
  revalidateBoard();
  return { success: true };
}

// ─── Checklists ──────────────────────────────────────────────────────────────

export async function createChecklist(cardId: string, title: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("task_checklists")
    .insert({ card_id: cardId, title })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await writeAudit(user.id, "checklist.create", "task_checklist", data.id, { title });
  revalidateBoard();
  return { success: true, data: { id: data.id } };
}

export async function addChecklistItem(checklistId: string, title: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("task_checklist_items")
    .select("position")
    .eq("checklist_id", checklistId)
    .order("position", { ascending: false })
    .limit(1);

  const position = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("task_checklist_items")
    .insert({ checklist_id: checklistId, title, position })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "checklist.item.add", "task_checklist_item", data.id, { title });
  revalidateBoard();
  return { success: true };
}

export async function toggleChecklistItem(itemId: string, completed: boolean): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("task_checklist_items")
    .update({ is_completed: completed })
    .eq("id", itemId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "checklist.item.toggle", "task_checklist_item", itemId, { completed });
  revalidateBoard();
  return { success: true };
}

export async function deleteChecklistItem(itemId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("task_checklist_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidateBoard();
  return { success: true };
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export async function addCardAttachment(
  cardId: string,
  fileName: string,
  fileUrl: string,
  fileType?: string,
  fileSize?: number,
): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      card_id: cardId,
      file_name: fileName,
      file_url: fileUrl,
      file_type: fileType ?? null,
      file_size: fileSize ?? null,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "card.attachment.add", "task_attachment", data.id, { fileName });
  revalidateBoard();
  return { success: true };
}

export async function deleteAttachment(attachmentId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("task_attachments").delete().eq("id", attachmentId);
  if (error) return { error: error.message };
  revalidateBoard();
  return { success: true };
}

export async function addAttachmentFromFile(cardId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireAuth();
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };
  if (file.size > 512000) return { error: "File must be under 500KB" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const fileUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;

  return addCardAttachment(cardId, file.name, fileUrl, file.type, file.size);
}

// ─── Whiteboard ──────────────────────────────────────────────────────────────

export async function saveWhiteboardScene(whiteboardId: string, sceneData: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = createAdminClient();

  let parsed: unknown;
  try {
    parsed = JSON.parse(sceneData);
  } catch {
    return { error: "Invalid scene data" };
  }

  const { error } = await supabase
    .from("club_whiteboards")
    .update({ scene_data: parsed, updated_by: user.id })
    .eq("id", whiteboardId);

  if (error) return { error: error.message };
  revalidateWhiteboard();
  return { success: true };
}
