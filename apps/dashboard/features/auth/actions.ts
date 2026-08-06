"use server";

import { createServerClient } from "@kitsic/auth";
import { createAdminClient, logAuditEvent } from "@kitsic/database";
import { headers } from "next/headers";
import { getPayloadString, toActionErrorMessage } from "@/lib/action-error";
import { sendOtpEmail } from "@/lib/email";
import { storeOtp, verifyOtp } from "@/lib/otp";

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

async function signInAfterSignup(email: string, password: string): Promise<AuthResult> {
  const supabase = await createServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (!signInError) {
    return { success: true, redirectTo: "/" };
  }

  return {
    success: true,
    redirectTo: "/login",
    message: "Account created! Sign in with your roll number or email.",
  };
}

async function recoverExistingSignupUser(
  email: string,
  password: string,
  profile: { fullName: string; rollNumber: string; branch: string; phone: string },
): Promise<AuthResult> {
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
    return { error: toActionErrorMessage(updateError, "Could not finish account setup. Try signing in.") };
  }

  await admin.from("users").upsert({
    id: existing.id,
    email,
    full_name: profile.fullName,
    phone: profile.phone,
    roll_number: profile.rollNumber,
    branch: profile.branch,
    bio: `Roll No: ${profile.rollNumber} · ${profile.branch}`,
  }, { onConflict: "id" });

  return signInAfterSignup(email, password);
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
  try {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const otp = (formData.get("otp") as string)?.trim();
    if (!email || !otp) return { error: "Email and verification code are required." };

    const verified = await verifyOtp(email, otp);
    if (!verified.ok) return { error: verified.error };

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
    const admin = createAdminClient();

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
      if (
        message.includes("already")
        || message.includes("registered")
        || message.includes("exists")
        || createError.status === 422
      ) {
        return recoverExistingSignupUser(email, password, profile);
      }
      return { error: toActionErrorMessage(createError, "Could not create account. Please try again.") };
    }

    const userId = createData.user?.id;
    if (!userId) {
      return { error: "Account creation failed. Please try again." };
    }

    const { error: profileError } = await admin.from("users").update({
      full_name: fullName,
      phone,
      roll_number: rollNumber,
      branch,
      bio: `Roll No: ${rollNumber} · ${branch}`,
    }).eq("id", userId);

    if (profileError) {
      console.error("Profile update failed:", profileError.message);
    }

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
      // Non-blocking — signup should still succeed
    }

    return signInAfterSignup(email, password);
  } catch (err) {
    console.error("completeSignupWithOtp:", err);
    const message = toActionErrorMessage(err, "");
    if (message.includes("email_otps") || message.includes("does not exist")) {
      return { error: "Database not ready. Contact support or try again later." };
    }
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return { error: "Server configuration error. Contact the club admin." };
    }
    return { error: message || "Verification failed. Please try again." };
  }
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
