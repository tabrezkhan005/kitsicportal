"use server";

import { createServerClient } from "@kitsic/auth";
import { createAdminClient, logAuditEvent } from "@kitsic/database";
import { headers } from "next/headers";
import { toActionErrorMessage } from "@/lib/action-error";
import { runCompleteSignup } from "@/lib/complete-signup";
import { sendOtpEmail } from "@/lib/email";
import { storeOtp } from "@/lib/otp";

interface AuthResult {
  error?: string;
  success?: boolean;
  redirectTo?: string;
  message?: string;
  otpSent?: boolean;
}

async function resolveUsernameToEmail(username: string): Promise<string | null> {
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
    (u) => u.email.split("@")[0].toLowerCase() === trimmed.toLowerCase(),
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
