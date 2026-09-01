import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@kitsic/auth";
import { createAdminClient, logAuditEvent } from "@kitsic/database";
import { headers } from "next/headers";
import { getPayloadString, toActionErrorMessage } from "@/lib/action-error";
import { consumeLeadershipInviteCode, verifyLeadershipInviteCode } from "@/lib/leadership-invite";
import { consumeOtp, verifyOtp } from "@/lib/otp";

export interface LeadershipSignupResult {
  error?: string;
  success?: boolean;
  redirectTo?: string;
  message?: string;
}

async function assignLeadershipRole(admin: SupabaseClient, userId: string, roleSlug: string) {
  const { data: role } = await admin.from("roles").select("id").eq("slug", roleSlug).maybeSingle();
  if (!role?.id) throw new Error(`Role "${roleSlug}" is not configured. Run db:seed and db:migrate:leadership-roles.`);

  await admin.from("user_roles").delete().eq("user_id", userId);
  const { error } = await admin.from("user_roles").insert({ user_id: userId, role_id: role.id });
  if (error) throw new Error(`Could not assign ${roleSlug} role: ${error.message}`);
}

async function ensureHeadProfile(
  admin: SupabaseClient,
  userId: string,
  email: string,
  profile: { fullName: string; phone: string; branch: string; rollNumber: string },
) {
  const { data: existing } = await admin.from("users").select("id, member_id").eq("id", userId).maybeSingle();

  let memberId = existing?.member_id;
  if (!memberId) {
    const { data: generated, error } = await admin.rpc("generate_member_id");
    if (error) throw new Error(error.message);
    memberId = generated;
  }

  const { error: profileError } = await admin.from("users").upsert({
    id: userId,
    email,
    full_name: profile.fullName,
    phone: profile.phone,
    roll_number: profile.rollNumber || null,
    branch: profile.branch || null,
    member_id: memberId,
    avatar_color: "#033565",
    bio: profile.rollNumber && profile.branch
      ? `Roll No: ${profile.rollNumber} · ${profile.branch}`
      : `Leadership · ${profile.branch || "KITSIC"}`,
    skills: [],
  }, { onConflict: "id" });

  if (profileError) throw new Error(`Could not save profile: ${profileError.message}`);
}

async function signInAfterSignup(email: string, password: string): Promise<LeadershipSignupResult> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return { success: true, redirectTo: "/" };
  return {
    success: true,
    redirectTo: "/login",
    message: `Registration complete! Sign in with your email. (${error.message})`,
  };
}

export async function runCompleteLeadershipSignup(formData: FormData): Promise<LeadershipSignupResult> {
  let otpId: string | null = null;
  let inviteId: string | null = null;

  try {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const otp = (formData.get("otp") as string)?.trim();
    const roleSlug = (formData.get("role_slug") as string)?.trim();
    const inviteCode = (formData.get("invite_code") as string)?.trim();

    if (!email || !otp || !roleSlug || !inviteCode) {
      return { error: "Email, role, invite code, and OTP are required." };
    }

    const inviteCheck = await verifyLeadershipInviteCode(roleSlug, inviteCode);
    if (!inviteCheck.ok) return { error: inviteCheck.error };
    inviteId = inviteCheck.inviteId ?? null;

    const admin = createAdminClient();
    const verified = await verifyOtp(email, otp);
    if (!verified.ok) return { error: verified.error };

    otpId = verified.otpId;
    const payload = verified.payload;
    const fullName = getPayloadString(payload, "fullName", "full_name");
    const branch = getPayloadString(payload, "branch");
    const rollNumber = getPayloadString(payload, "rollNumber", "roll_number");
    const phone = getPayloadString(payload, "phone");
    const password = getPayloadString(payload, "password");
    const payloadRole = getPayloadString(payload, "role_slug", "roleSlug");

    if (!fullName || !password || payloadRole !== roleSlug) {
      return { error: "Signup session expired or role mismatch. Start again." };
    }

    const profile = { fullName, phone, branch, rollNumber };

    const { data: existingProfile } = await admin.from("users").select("id").eq("email", email).maybeSingle();
    if (existingProfile) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("roles(slug)")
        .eq("user_id", existingProfile.id);

      const slugs = (roles ?? []).map((r) => {
        const role = r.roles as { slug: string } | { slug: string }[] | null;
        return Array.isArray(role) ? role[0]?.slug : role?.slug;
      }).filter(Boolean);

      if (slugs.some((s) => s !== "member")) {
        return { error: "This email already has a leadership account. Sign in instead." };
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(existingProfile.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, roll_number: rollNumber, branch, phone },
      });
      if (updateError) return { error: updateError.message };

      await ensureHeadProfile(admin, existingProfile.id, email, profile);
      await assignLeadershipRole(admin, existingProfile.id, roleSlug);

      if (otpId) await consumeOtp(otpId);
      if (inviteId) await consumeLeadershipInviteCode(inviteId);

      return signInAfterSignup(email, password);
    }

    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        roll_number: rollNumber,
        branch,
        phone,
        leadership_role: roleSlug,
      },
    });

    if (createError) {
      return { error: createError.message };
    }

    const userId = createData.user?.id;
    if (!userId) return { error: "Account creation failed." };

    await ensureHeadProfile(admin, userId, email, profile);
    await assignLeadershipRole(admin, userId, roleSlug);

    try {
      const headerList = await headers();
      await logAuditEvent({
        userId,
        action: "auth.leadership_sign_up",
        entityType: "user",
        entityId: userId,
        newValue: { email, roleSlug },
        ipAddress: headerList.get("x-forwarded-for"),
        userAgent: headerList.get("user-agent"),
      });
    } catch {
      // non-blocking
    }

    if (otpId) await consumeOtp(otpId);
    if (inviteId) await consumeLeadershipInviteCode(inviteId);

    return signInAfterSignup(email, password);
  } catch (err) {
    console.error("runCompleteLeadershipSignup:", err);
    return { error: toActionErrorMessage(err, "Leadership registration failed.") };
  }
}
