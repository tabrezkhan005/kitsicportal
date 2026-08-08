import "./load-env";
import { createAdminClient } from "./supabase-admin";

const PRESIDENT_EMAIL = "president@kitsic.in";
const PRESIDENT_PASSWORD = "President2026!";
const PRESIDENT_NAME = "President";
const PRESIDENT_ROLE = "president";

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
    throw new Error(`Role not found: ${roleSlug}. Run npm run db:seed first.`);
  }

  await supabase.from("user_roles").delete().eq("user_id", userId);

  const { error: assignError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role_id: role.id,
  });

  if (assignError) throw assignError;
}

async function ensureProfile(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
) {
  const { data: existing } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();

  if (existing) {
    await supabase
      .from("users")
      .update({ email, full_name: PRESIDENT_NAME })
      .eq("id", userId);
    return;
  }

  const { data: memberId, error: memberIdError } = await supabase.rpc("generate_member_id");
  if (memberIdError) throw memberIdError;

  const { error: profileError } = await supabase.from("users").insert({
    id: userId,
    email,
    full_name: PRESIDENT_NAME,
    member_id: memberId,
    avatar_color: "#033565",
    skills: [],
  });

  if (profileError) throw profileError;
}

async function createPresidentAccount() {
  const supabase = createAdminClient();
  const email = PRESIDENT_EMAIL.toLowerCase();

  const { data: listed } = await supabase.auth.admin.listUsers();
  const existing = listed.users.find((user) => user.email?.toLowerCase() === email);

  let userId: string;

  if (existing) {
    userId = existing.id;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: PRESIDENT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: PRESIDENT_NAME },
    });
    if (error) throw error;
    console.log(`Updated existing account: ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PRESIDENT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: PRESIDENT_NAME },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created account: ${email}`);
  }

  await ensureProfile(supabase, userId, email);
  await assignRole(supabase, userId, PRESIDENT_ROLE);

  console.log(`Assigned role: ${PRESIDENT_ROLE}`);
  console.log("\nPresident login ready:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${PRESIDENT_PASSWORD}`);
}

createPresidentAccount().catch((error) => {
  console.error("Failed to create president account:", error);
  process.exit(1);
});
