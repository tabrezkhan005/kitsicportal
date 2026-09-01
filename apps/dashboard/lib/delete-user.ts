import "server-only";

import { createAdminClient } from "@kitsic/database";

interface DeleteUserResult {
  ok: boolean;
  error?: string;
}

async function safeDelete(admin: ReturnType<typeof createAdminClient>, table: string, column: string, value: string) {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error && !error.message.includes("does not exist") && !error.message.includes("Could not find the table")) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function safeNullify(admin: ReturnType<typeof createAdminClient>, table: string, column: string, userId: string) {
  const { error } = await admin.from(table).update({ [column]: null }).eq(column, userId);
  if (error && !error.message.includes("does not exist") && !error.message.includes("Could not find the table")) {
    throw new Error(`${table}.${column}: ${error.message}`);
  }
}

export async function deleteUserCompletely(userId: string): Promise<DeleteUserResult> {
  const admin = createAdminClient();

  const { data: user, error: fetchError } = await admin
    .from("users")
    .select("id, email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!user) return { ok: false, error: "User not found." };

  const { data: roleLinks } = await admin
    .from("user_roles")
    .select("roles(slug)")
    .eq("user_id", userId);

  const roleSlugs = (roleLinks ?? []).map((link) => {
    const role = link.roles as { slug: string } | { slug: string }[] | null;
    return Array.isArray(role) ? role[0]?.slug : role?.slug;
  }).filter(Boolean) as string[];

  if (roleSlugs.includes("president")) {
    const { data: presidentRole } = await admin.from("roles").select("id").eq("slug", "president").maybeSingle();
    if (presidentRole) {
      const { count } = await admin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role_id", presidentRole.id);
      if ((count ?? 0) <= 1) {
        return { ok: false, error: "Cannot delete the only president account." };
      }
    }
  }

  const directDeletes: Array<[string, string]> = [
    ["task_card_members", "user_id"],
    ["task_card_comments", "user_id"],
    ["learning_submissions", "user_id"],
    ["project_members", "user_id"],
    ["attendance_records", "user_id"],
    ["notifications", "user_id"],
    ["certificates", "user_id"],
    ["leadership_messages", "sender_id"],
    ["user_roles", "user_id"],
  ];

  for (const [table, column] of directDeletes) {
    await safeDelete(admin, table, column, userId);
  }

  await safeDelete(admin, "email_otps", "email", user.email.toLowerCase());
  await safeDelete(admin, "audit_logs", "user_id", userId);

  const nullifyTargets: Array<[string, string[]]> = [
    ["tasks", ["assigned_to", "assigned_by"]],
    ["meetings", ["created_by", "mom_assignee_id"]],
    ["events", ["created_by"]],
    ["announcements", ["created_by"]],
    ["projects", ["lead_id", "created_by"]],
    ["expenses", ["paid_by", "approved_by"]],
    ["event_proposals", ["proposed_by", "reviewed_by"]],
    ["club_resources", ["created_by", "uploaded_by"]],
    ["resources", ["created_by", "uploaded_by"]],
    ["learning_modules", ["created_by"]],
    ["inventory_items", ["created_by"]],
    ["qr_sessions", ["created_by"]],
    ["task_cards", ["created_by"]],
    ["task_boards", ["created_by"]],
    ["task_attachments", ["uploaded_by"]],
    ["club_whiteboards", ["updated_by"]],
    ["certificates", ["issued_by"]],
    ["sponsors", ["created_by"]],
    ["api_keys", ["created_by"]],
  ];

  for (const [table, columns] of nullifyTargets) {
    for (const column of columns) {
      await safeNullify(admin, table, column, userId);
    }
  }

  const { error: userDeleteError } = await admin.from("users").delete().eq("id", userId);
  if (userDeleteError) return { ok: false, error: userDeleteError.message };

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    return { ok: false, error: `Profile removed but auth delete failed: ${authDeleteError.message}` };
  }

  return { ok: true };
}
