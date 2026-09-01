"use server";

import { createServerClient } from "@kitsic/auth";
import { createAdminClient, logAuditEvent } from "@kitsic/database";
import { headers } from "next/headers";
import { toActionErrorMessage } from "@/lib/action-error";
import { runCompleteSignup } from "@/lib/complete-signup";
import { resolveUsernameToEmail } from "@/lib/auth-resolve";
import { sendOtpEmail, sendPasswordResetEmail } from "@/lib/email";
import { storeOtp, verifyOtp, consumeOtp } from "@/lib/otp";

interface AuthResult {
  error?: string;
  success?: boolean;
  redirectTo?: string;
  message?: string;
  otpSent?: boolean;
  email?: string;
}


export async function sendPasswordResetOtp(formData: FormData): Promise<AuthResult> {
  const identifier = (formData.get("identifier") as string)?.trim();
  if (!identifier) return { error: "Email or roll number is required." };

  const email = await resolveUsernameToEmail(identifier);
  if (!email) return { error: "No account found with that email or roll number." };

  const admin = createAdminClient();
  const { data: user } = await admin.from("users").select("id").eq("email", email).maybeSingle();
  if (!user) return { error: "No account found with that email or roll number." };

  try {
    const otp = await storeOtp(email, { purpose: "password_reset", email });
    const mail = await sendPasswordResetEmail(email, otp);
    if (!mail.ok) {
      if (process.env.NODE_ENV === "development" && "dev" in mail && mail.dev) {
        return { success: true, otpSent: true, message: `Dev mode: reset code is ${otp}`, email };
      }
      return { error: mail.error ?? "Could not send reset email." };
    }
    return { success: true, otpSent: true, message: "Password reset code sent to your email.", email };
  } catch (error) {
    return { error: toActionErrorMessage(error, "Could not send reset code.") };
  }
}

export async function resetPasswordWithOtp(formData: FormData): Promise<AuthResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const otp = (formData.get("otp") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!email || !otp || !password) return { error: "All fields are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const verified = await verifyOtp(email, otp);
  if (!verified.ok) return { error: verified.error };

  const payload = verified.payload;
  if (payload.purpose !== "password_reset") {
    return { error: "Invalid reset code. Request a new password reset." };
  }

  const admin = createAdminClient();
  const { data: user } = await admin.from("users").select("id").eq("email", email).maybeSingle();
  if (!user) return { error: "Account not found." };

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password });
  if (updateError) return { error: updateError.message };

  await consumeOtp(verified.otpId);

  const headerList = await headers();
  await logAuditEvent({
    userId: user.id,
    action: "auth.password_reset",
    entityType: "user",
    entityId: user.id,
    ipAddress: headerList.get("x-forwarded-for"),
    userAgent: headerList.get("user-agent"),
  });

  return { success: true, message: "Password updated. You can sign in now.", redirectTo: "/login" };
}

export async function signInWithUsername(formData: FormData): Promise<AuthResult> {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) || "/";

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const email = await resolveUsernameToEmail(username);
  if (!email) {
    return { error: "Invalid username or password." };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid username or password." };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const headerList = await headers();
    await logAuditEvent({
      userId: user.id,
      action: "auth.sign_in",
      entityType: "user",
      entityId: user.id,
      ipAddress: headerList.get("x-forwarded-for"),
      userAgent: headerList.get("user-agent"),
    });
  }

  return { success: true, redirectTo };
}

export async function signInWithEmail(formData: FormData): Promise<AuthResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const headerList = await headers();
    await logAuditEvent({
      userId: user.id,
      action: "auth.sign_in",
      entityType: "user",
      entityId: user.id,
      ipAddress: headerList.get("x-forwarded-for"),
      userAgent: headerList.get("user-agent"),
    });
  }

  return { success: true, redirectTo };
}

export async function sendSignupOtp(formData: FormData): Promise<AuthResult> {
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const branch = (formData.get("branch") as string)?.trim();
  const rollNumber = (formData.get("roll_number") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!fullName || !email || !branch || !rollNumber || !phone || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const admin = createAdminClient();
  const [{ data: existingEmail }, { data: existingRoll }] = await Promise.all([
    admin.from("users").select("id").eq("email", email).maybeSingle(),
    admin.from("users").select("id").eq("roll_number", rollNumber).maybeSingle(),
  ]);
  if (existingEmail) return { error: "An account with this email already exists." };
  if (existingRoll) return { error: "This roll number is already registered." };

  try {
    const otp = await storeOtp(email, { fullName, email, branch, rollNumber, phone, password });
    const mail = await sendOtpEmail(email, otp);
    if (!mail.ok) {
      if (process.env.NODE_ENV === "development" && "dev" in mail && mail.dev) {
        return { success: true, otpSent: true, message: `Dev mode: OTP is ${otp}` };
      }
      return { error: mail.error ?? "Could not send verification email." };
    }
    return { success: true, otpSent: true, message: "Verification code sent to your email." };
  } catch (error) {
    return { error: toActionErrorMessage(error, "Could not send OTP.") };
  }
}

export async function completeSignupWithOtp(formData: FormData): Promise<AuthResult> {
  return runCompleteSignup(formData);
}

export async function signUpWithEmail(formData: FormData): Promise<AuthResult> {
  const otp = (formData.get("otp") as string)?.trim();
  if (otp) return completeSignupWithOtp(formData);
  return sendSignupOtp(formData);
}

export async function sendLeadershipSignupOtp(formData: FormData): Promise<AuthResult> {
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const branch = (formData.get("branch") as string)?.trim();
  const rollNumber = (formData.get("roll_number") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;
  const roleSlug = (formData.get("role_slug") as string)?.trim();
  const inviteCode = (formData.get("invite_code") as string)?.trim();

  if (!fullName || !email || !phone || !password || !roleSlug || !inviteCode) {
    return { error: "All required fields must be filled." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const { verifyLeadershipInviteCode } = await import("@/lib/leadership-invite");
  const invite = await verifyLeadershipInviteCode(roleSlug, inviteCode);
  if (!invite.ok) return { error: invite.error };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    const { data: roles } = await admin
      .from("user_roles")
      .select("roles(slug)")
      .eq("user_id", existing.id);
    const slugs = (roles ?? []).map((r) => {
      const role = r.roles as { slug: string } | { slug: string }[] | null;
      return Array.isArray(role) ? role[0]?.slug : role?.slug;
    });
    if (slugs.some((s) => s && s !== "member")) {
      return { error: "This email already has a leadership account." };
    }
  }

  try {
    const otp = await storeOtp(email, {
      fullName,
      email,
      branch,
      rollNumber,
      phone,
      password,
      role_slug: roleSlug,
      invite_code: inviteCode.toUpperCase(),
      signup_type: "leadership",
    });
    const mail = await sendOtpEmail(email, otp);
    if (!mail.ok) {
      return { error: mail.error ?? "Could not send verification email." };
    }
    return { success: true, otpSent: true, message: "Verification code sent to your email." };
  } catch (error) {
    return { error: toActionErrorMessage(error, "Could not send OTP.") };
  }
}

export async function completeLeadershipSignup(formData: FormData): Promise<AuthResult> {
  const { runCompleteLeadershipSignup } = await import("@/lib/complete-leadership-signup");
  return runCompleteLeadershipSignup(formData);
}

export async function signUpLeadership(formData: FormData): Promise<AuthResult> {
  const otp = (formData.get("otp") as string)?.trim();
  if (otp) return completeLeadershipSignup(formData);
  return sendLeadershipSignupOtp(formData);
}

export async function signInWithMagicLink(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Check your email for the magic link." };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    return { success: true, redirectTo: data.url };
  }

  return { error: "Could not start Google sign-in." };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.auth.signOut();

  if (user) {
    const headerList = await headers();
    await logAuditEvent({
      userId: user.id,
      action: "auth.sign_out",
      entityType: "user",
      entityId: user.id,
      ipAddress: headerList.get("x-forwarded-for"),
      userAgent: headerList.get("user-agent"),
    });
  }

  return { success: true, redirectTo: "/login" };
}
