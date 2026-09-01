import "server-only";

import { createAdminClient } from "@kitsic/database";

export async function resolveUsernameToEmail(username: string): Promise<string | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const admin = createAdminClient();

  const { data: byRoll } = await admin
    .from("users")
    .select("email")
    .eq("roll_number", trimmed)
    .maybeSingle();
  if (byRoll?.email) return byRoll.email;

  const { data: byMemberId } = await admin
    .from("users")
    .select("email")
    .eq("member_id", trimmed.toUpperCase())
    .maybeSingle();
  if (byMemberId?.email) return byMemberId.email;

  const { data: byRollBio } = await admin
    .from("users")
    .select("email")
    .ilike("bio", `%Roll No: ${trimmed}%`)
    .maybeSingle();
  if (byRollBio?.email) return byRollBio.email;

  const { data: users } = await admin.from("users").select("email");
  const localMatch = users?.find(
    (user) => user.email.split("@")[0].toLowerCase() === trimmed.toLowerCase(),
  );
  if (localMatch?.email) return localMatch.email;

  if (process.env.NODE_ENV === "development") {
    const demoEmail = `${trimmed.toLowerCase()}@demo.kitsic`;
    const { data: demoUser } = await admin
      .from("users")
      .select("email")
      .eq("email", demoEmail)
      .maybeSingle();
    if (demoUser?.email) return demoUser.email;
  }

  return null;
}
