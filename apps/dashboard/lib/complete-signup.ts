import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@kitsic/auth";
import { createAdminClient, logAuditEvent } from "@kitsic/database";
import { headers } from "next/headers";
import { getPayloadString, toActionErrorMessage } from "@/lib/action-error";
import { consumeOtp, verifyOtp } from "@/lib/otp";

export interface SignupResult {
  error?: string;
  success?: boolean;
  redirectTo?: string;
  message?: string;
}

function fail(error: unknown, fallback: string): SignupResult {
  return { error: toActionErrorMessage(error, fallback) };
}

function formatAuthCreateError(error: { message?: string; status?: number; name?: string }) {
  const message = error.message?.trim();
  if (message && message !== "{}") return message;
  if (error.status === 500) {
    return "Database error while creating your account. The club admin must apply the signup database fix (run db:migrate:signup-fix in Supabase).";
  }
  return `Could not create account (HTTP ${error.status ?? "unknown"}).`;
}

async function ensureMemberProfile(
  admin: SupabaseClient,
  userId: string,
  email: string,
  profile: { fullName: string; rollNumber: string; branch: string; phone: string },
) {
  const { data: memberId, error: memberIdError } = await admin.rpc("generate_member_id");
  if (memberIdError) throw new Error(`Could not assign member ID: ${memberIdError.message}`);

  const { error: profileError } = await admin.from("users").upsert({
    id: userId,
    email,
    full_name: profile.fullName,
    phone: profile.phone,
    roll_number: profile.rollNumber,
    branch: profile.branch,
    member_id: memberId,
    avatar_color: "#033565",
    bio: `Roll No: ${profile.rollNumber} · ${profile.branch}`,
    skills: [],
  }, { onConflict: "id" });

  if (profileError) throw new Error(`Could not save profile: ${profileError.message}`);

  const { data: memberRole } = await admin.from("roles").select("id").eq("slug", "member").maybeSingle();
  if (!memberRole?.id) {
    throw new Error("Member role is missing in the database. Run npm run db:seed.");
  }

  const { error: roleError } = await admin.from("user_roles").upsert(
    { user_id: userId, role_id: memberRole.id },
    { onConflict: "user_id,role_id" },
  );
  if (roleError) {
    throw new Error(`Could not assign member role: ${roleError.message}`);
  }
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) return null;

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function signInAfterSignup(email: string, password: string): Promise<SignupResult> {
  const supabase = await createServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (!signInError) {
    return { success: true, redirectTo: "/" };
  }

  return {
    success: true,
    redirectTo: "/login",
    message: `Account created! Sign in with your roll number or email. (${signInError.message})`,
  };
}

async function recoverExistingSignupUser(
  email: string,
  password: string,
  profile: { fullName: string; rollNumber: string; branch: string; phone: string },
): Promise<SignupResult> {
  const admin = createAdminClient();
  const existing = await findAuthUserByEmail(email);

  if (!existing) {
    return { error: "An account with this email already exists. Try signing in." };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: {
      full_name: profile.fullName,
      roll_number: profile.rollNumber,
      branch: profile.branch,
      phone: profile.phone,
    },
  });

  if (updateError) {
    return fail(updateError, `Could not finish account setup: ${updateError.message || "try signing in manually."}`);
  }

  await ensureMemberProfile(admin, existing.id, email, profile);
  return signInAfterSignup(email, password);
}

export async function runCompleteSignup(formData: FormData): Promise<SignupResult> {
  let otpId: string | null = null;

  try {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const otp = (formData.get("otp") as string)?.trim();
    if (!email || !otp) {
      return { error: "Email and verification code are required." };
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (err) {
      return fail(err, "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel environment variables.");
    }

    const verified = await verifyOtp(email, otp);
    if (!verified.ok) {
      return { error: verified.error };
    }

    otpId = verified.otpId;
    const payload = verified.payload;
    const fullName = getPayloadString(payload, "fullName", "full_name");
    const branch = getPayloadString(payload, "branch");
    const rollNumber = getPayloadString(payload, "rollNumber", "roll_number");
    const phone = getPayloadString(payload, "phone");
    const password = getPayloadString(payload, "password");

    if (!fullName || !password) {
      return { error: "Signup session expired. Request a new verification code and try again." };
    }

    const profile = { fullName, rollNumber, branch, phone };

    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        roll_number: rollNumber,
        branch,
        phone,
      },
    });

    if (createError) {
      const message = createError.message?.toLowerCase() ?? "";
      const status = createError.status ?? 0;

      if (
        message.includes("already")
        || message.includes("registered")
        || message.includes("exists")
        || status === 422
      ) {
        const recovered = await recoverExistingSignupUser(email, password, profile);
        if (!recovered.error && otpId) await consumeOtp(otpId);
        return recovered;
      }

      return { error: formatAuthCreateError(createError) };
    }

    const userId = createData.user?.id;
    if (!userId) {
      return { error: "Account creation failed: Supabase returned no user id." };
    }

    await ensureMemberProfile(admin, userId, email, profile);

    try {
      const headerList = await headers();
      await logAuditEvent({
        userId,
        action: "auth.sign_up",
        entityType: "user",
        entityId: userId,
        newValue: { email, rollNumber, branch },
        ipAddress: headerList.get("x-forwarded-for"),
        userAgent: headerList.get("user-agent"),
      });
    } catch {
      // Non-blocking
    }

    if (otpId) await consumeOtp(otpId);
    return signInAfterSignup(email, password);
  } catch (err) {
    console.error("runCompleteSignup:", err);
    const message = toActionErrorMessage(err, "");
    if (message.includes("email_otps") || message.includes("does not exist")) {
      return fail(err, "Database not ready. Run platform migrations on Supabase.");
    }
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return fail(err, "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel environment variables.");
    }
    return fail(err, message || "Verification failed. Please try again.");
  }
}
