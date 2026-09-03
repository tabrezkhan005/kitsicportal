import "server-only";

import { createAdminClient } from "@kitsic/database";

interface DeleteUserResult {
  ok: boolean;
  error?: string;
}

type AdminClient = ReturnType<typeof createAdminClient>;

function isIgnorableSchemaError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist")
    || lower.includes("could not find the table")
    || lower.includes("could not find the")
    || lower.includes("schema cache")
    || lower.includes("column")
  );
}

async function safeDelete(admin: AdminClient, table: string, column: string, value: string) {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error && !isIgnorableSchemaError(error.message)) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function safeNullify(admin: AdminClient, table: string, column: string, userId: string) {
  const { error } = await admin.from(table).update({ [column]: null }).eq(column, userId);
  if (error && !isIgnorableSchemaError(error.message)) {
    throw new Error(`${table}.${column}: ${error.message}`);
  }
}

/**
 * Permanently remove a user from auth + public.users and clear FK references.
 */
export async function deleteUserCompletely(userId: string): Promise<DeleteUserResult> {
  const admin = createAdminClient();

  try {
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

    // Clear FK pointers TO this user first (including roles they assigned to others)
    const nullifyTargets: Array<[string, string]> = [
      ["user_roles", "assigned_by"],
      ["tasks", "assigned_to"],
      ["tasks", "assigned_by"],
      ["meetings", "created_by"],
      ["meetings", "mom_assignee_id"],
      ["events", "created_by"],
      ["announcements", "created_by"],
      ["projects", "lead_id"],
      ["projects", "created_by"],
      ["expenses", "paid_by"],
      ["expenses", "approved_by"],
      ["event_proposals", "proposed_by"],
      ["event_proposals", "reviewed_by"],
      ["event_proposal_attachments", "uploaded_by"],
      ["club_resources", "created_by"],
      ["learning_modules", "created_by"],
      ["inventory_items", "assigned_to"],
      ["qr_sessions", "created_by"],
      ["task_cards", "created_by"],
      ["task_boards", "created_by"],
      ["task_attachments", "uploaded_by"],
      ["club_whiteboards", "updated_by"],
      ["certificates", "issued_by"],
      ["api_keys", "created_by"],
      ["audit_logs", "user_id"],
    ];

    for (const [table, column] of nullifyTargets) {
      await safeNullify(admin, table, column, userId);
    }

    // Rows owned by / about this user
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

    if (user.email) {
      await safeDelete(admin, "email_otps", "email", user.email.toLowerCase());
    }

    const { error: userDeleteError } = await admin.from("users").delete().eq("id", userId);
    if (userDeleteError) {
      return {
        ok: false,
        error: `Could not delete profile: ${userDeleteError.message}. Another record may still reference this user.`,
      };
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      // Profile row is gone; try to avoid leaving a login behind.
      return {
        ok: false,
        error: `Profile deleted, but login removal failed: ${authDeleteError.message}. Try again or remove the auth user in Supabase.`,
      };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete member.";
    console.error("deleteUserCompletely failed", userId, message);
    return { ok: false, error: message };
  }
}
