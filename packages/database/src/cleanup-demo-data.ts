import "./load-env";
import { createAdminClient } from "./supabase-admin";
import { DEMO_ACCOUNTS } from "./demo-accounts";

const DEMO_BOARD_ID = "a0000000-0000-0000-0000-000000000001";
const DEMO_EMAIL_SUFFIX = "@demo.kitsic";

async function deleteAll(admin: ReturnType<typeof createAdminClient>, table: string) {
  const { error, count } = await admin.from(table).delete({ count: "exact" }).neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) {
    if (error.message.includes("does not exist") || error.message.includes("Could not find the table")) {
      return 0;
    }
    throw new Error(`${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function deleteByUserIds(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  column: string,
  userIds: string[],
) {
  if (!userIds.length) return 0;
  const { error, count } = await admin.from(table).delete({ count: "exact" }).in(column, userIds);
  if (error) {
    if (error.message.includes("does not exist") || error.message.includes("Could not find the table")) {
      return 0;
    }
    throw new Error(`${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function cleanupDemoData() {
  const admin = createAdminClient();

  const { data: demoUsers } = await admin
    .from("users")
    .select("id, email, full_name")
    .like("email", `%${DEMO_EMAIL_SUFFIX}`);

  const demoIds = (demoUsers ?? []).map((user) => user.id);
  console.log(`Found ${demoIds.length} demo users to remove.`);

  const { data: demoCards } = await admin
    .from("task_cards")
    .select("id")
    .eq("board_id", DEMO_BOARD_ID);
  const demoCardIds = (demoCards ?? []).map((card) => card.id);

  if (demoCardIds.length) {
    const { data: checklists } = await admin.from("task_checklists").select("id").in("card_id", demoCardIds);
    const checklistIds = (checklists ?? []).map((item) => item.id);
    if (checklistIds.length) {
      const n = await deleteByUserIds(admin, "task_checklist_items", "checklist_id", checklistIds);
      console.log(`Deleted ${n} task_checklist_items`);
    }
    console.log(`Deleted ${await deleteByUserIds(admin, "task_checklists", "card_id", demoCardIds)} task_checklists`);
    console.log(`Deleted ${await deleteByUserIds(admin, "task_card_labels", "card_id", demoCardIds)} task_card_labels`);
    console.log(`Deleted ${await deleteByUserIds(admin, "task_card_members", "card_id", demoCardIds)} task_card_members`);
    console.log(`Deleted ${await deleteByUserIds(admin, "task_attachments", "card_id", demoCardIds)} task_attachments`);
  }

  console.log(`Deleted ${await admin.from("task_cards").delete({ count: "exact" }).eq("board_id", DEMO_BOARD_ID).then(r => r.count ?? 0)} demo task_cards`);

  const contentTables = [
    "learning_submissions",
    "learning_modules",
    "attendance_records",
    "notifications",
    "announcements",
    "meetings",
    "events",
    "tasks",
    "event_proposals",
    "leadership_messages",
    "resources",
    "project_members",
    "projects",
    "expenses",
    "budgets",
    "sponsors",
    "inventory_items",
    "certificates",
    "qr_sessions",
  ] as const;

  for (const table of contentTables) {
    const count = await deleteAll(admin, table);
    if (count > 0) console.log(`Deleted ${count} rows from ${table}`);
  }

  console.log(`Deleted ${await deleteByUserIds(admin, "audit_logs", "user_id", demoIds)} demo audit_logs`);
  console.log(`Deleted ${await admin.from("email_otps").delete({ count: "exact" }).like("email", `%${DEMO_EMAIL_SUFFIX}`).then(r => r.count ?? 0)} demo email_otps`);

  const { data: realUsers } = await admin
    .from("users")
    .select("id")
    .not("email", "like", `%${DEMO_EMAIL_SUFFIX}`)
    .order("created_at", { ascending: true })
    .limit(1);

  const keepUserId = realUsers?.[0]?.id ?? null;
  if (keepUserId) {
    for (const [table, column] of [
      ["club_whiteboards", "updated_by"],
      ["task_boards", "created_by"],
    ] as const) {
      const { error } = await admin.from(table).update({ [column]: keepUserId }).in(column, demoIds);
      if (error && !error.message.includes("Could not find the table")) {
        throw new Error(`${table}.${column}: ${error.message}`);
      }
    }
  }

  console.log(`Deleted ${await deleteByUserIds(admin, "user_roles", "user_id", demoIds)} demo user_roles`);

  const { error: usersError, count: usersDeleted } = await admin
    .from("users")
    .delete({ count: "exact" })
    .like("email", `%${DEMO_EMAIL_SUFFIX}`);

  if (usersError) throw new Error(`users: ${usersError.message}`);
  console.log(`Deleted ${usersDeleted ?? 0} demo public.users rows`);

  for (const account of DEMO_ACCOUNTS) {
    const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = authList.users.find((user) => user.email === account.email);
    if (!authUser) {
      console.log(`↷ auth user missing: ${account.email}`);
      continue;
    }
    const { error } = await admin.auth.admin.deleteUser(authUser.id);
    if (error) {
      console.error(`✗ auth delete ${account.email}: ${error.message}`);
      continue;
    }
    console.log(`✓ auth deleted: ${account.email}`);
  }

  const { data: remainingUsers } = await admin.from("users").select("email, full_name, member_id").order("created_at");
  console.log("\nRemaining users:");
  for (const user of remainingUsers ?? []) {
    console.log(`  • ${user.full_name ?? user.email} (${user.email}) ${user.member_id ?? ""}`);
  }

  console.log("\nDemo cleanup complete.");
}

cleanupDemoData().catch((error) => {
  console.error("Demo cleanup failed:", error);
  process.exit(1);
});
