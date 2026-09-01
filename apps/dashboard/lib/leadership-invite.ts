import { createAdminClient } from "@kitsic/database";
import { LEADERSHIP_SIGNUP_ROLES } from "@/lib/leadership-roles";

export async function verifyLeadershipInviteCode(roleSlug: string, code: string): Promise<{
  ok: boolean;
  error?: string;
  inviteId?: string;
}> {
  const normalizedCode = code.trim().toUpperCase();
  const allowed = LEADERSHIP_SIGNUP_ROLES.some((r) => r.slug === roleSlug);
  if (!allowed) return { ok: false, error: "Invalid leadership role selected." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("leadership_invite_codes")
    .select("id, role_slug, max_uses, used_count, expires_at, is_active")
    .eq("role_slug", roleSlug)
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data || !data.is_active) return { ok: false, error: "Invalid invite code for this role." };
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { ok: false, error: "This invite code has expired." };
  }
  if (data.used_count >= data.max_uses) {
    return { ok: false, error: "This invite code has reached its usage limit." };
  }

  return { ok: true, inviteId: data.id };
}

export async function consumeLeadershipInviteCode(inviteId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leadership_invite_codes")
    .select("used_count")
    .eq("id", inviteId)
    .single();

  if (!data) return;

  await supabase
    .from("leadership_invite_codes")
    .update({ used_count: (data.used_count ?? 0) + 1 })
    .eq("id", inviteId);
}
