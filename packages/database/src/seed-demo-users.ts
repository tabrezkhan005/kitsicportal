import "./load-env";
import { createAdminClient } from "./supabase-admin";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./demo-accounts";

async function assignRole(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  roleSlug: string,
) {
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("slug", roleSlug)
    .single();

  if (roleError || !role) {
    throw new Error(`Role not found: ${roleSlug}`);
  }

  await supabase.from("user_roles").delete().eq("user_id", userId);

  const { error: assignError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role_id: role.id,
  });

  if (assignError) throw assignError;
}

async function seedDemoUsers() {
  const supabase = createAdminClient();

  console.log("Creating demo users...\n");

  for (const account of DEMO_ACCOUNTS) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers.users.find((u) => u.email === account.email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      console.log(`↻ ${account.email} — already exists, updating role`);

      await supabase.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
        user_metadata: { full_name: account.fullName },
      });
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      });

      if (error) {
        console.error(`✗ ${account.email} — ${error.message}`);
        continue;
      }

      userId = data.user.id;
      console.log(`✓ ${account.email} — created`);
    }

    await supabase
      .from("users")
      .update({ full_name: account.fullName })
      .eq("id", userId);

    await assignRole(supabase, userId, account.role);
    console.log(`  → assigned role: ${account.role}`);
  }

  console.log("\nDemo accounts ready. Password for all accounts:");
  console.log(`  ${DEMO_PASSWORD}\n`);
}

seedDemoUsers().catch((error) => {
  console.error("Demo seed failed:", error);
  process.exit(1);
});
