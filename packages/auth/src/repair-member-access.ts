import { createAdminClient } from "@kitsic/database";

interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

export async function repairMemberAccess(authUser: AuthUserLike): Promise<boolean> {
  const admin = createAdminClient();

  const [{ data: profile }, { data: existingRoles }] = await Promise.all([
    admin.from("users").select("id").eq("id", authUser.id).maybeSingle(),
    admin.from("user_roles").select("user_id").eq("user_id", authUser.id).limit(1),
  ]);

  const hasProfile = Boolean(profile);
  const hasRole = Boolean(existingRoles?.length);
  if (hasProfile && hasRole) return false;

  const meta = authUser.user_metadata ?? {};
  const email = (authUser.email ?? "").toLowerCase();
  const fullName = (meta.full_name ?? meta.fullName ?? meta.name) as string | undefined;
  const rollNumber = (meta.roll_number ?? meta.rollNumber) as string | undefined;
  const branch = meta.branch as string | undefined;
  const phone = meta.phone as string | undefined;

  if (!hasProfile) {
    const { data: memberId, error: memberIdError } = await admin.rpc("generate_member_id");
    if (memberIdError) {
      console.error("repairMemberAccess: generate_member_id failed:", memberIdError.message);
      return false;
    }

    const { error: profileError } = await admin.from("users").upsert({
      id: authUser.id,
      email,
      full_name: fullName ?? null,
      phone: phone ?? null,
      roll_number: rollNumber ?? null,
      branch: branch ?? null,
      member_id: memberId,
      avatar_color: "#033565",
      bio: rollNumber && branch ? `Roll No: ${rollNumber} · ${branch}` : null,
      skills: [],
    }, { onConflict: "id" });

    if (profileError) {
      console.error("repairMemberAccess: profile upsert failed:", profileError.message);
      return false;
    }
  }

  if (!hasRole) {
    const { data: memberRole } = await admin.from("roles").select("id").eq("slug", "member").maybeSingle();
    if (!memberRole?.id) {
      console.error("repairMemberAccess: member role not found in database");
      return false;
    }

    const { error: roleError } = await admin.from("user_roles").upsert(
      { user_id: authUser.id, role_id: memberRole.id },
      { onConflict: "user_id,role_id" },
    );

    if (roleError) {
      console.error("repairMemberAccess: role assignment failed:", roleError.message);
      return false;
    }
  }

  return true;
}
