# KITSIC Signup Backend (Email OTP + Google OAuth)

Backend-only reference for member signup. Covers OTP email signup, Google OAuth sign-in, profile/role provisioning, and the SQL migrations that support it.

---

## Table of contents

1. [Overview](#1-overview)
2. [Environment variables](#2-environment-variables)
3. [Architecture & flows](#3-architecture--flows)
4. [File map](#4-file-map)
5. [Supabase / Google setup](#5-supabase--google-setup)
6. [Backend code](#6-backend-code)
7. [Database migrations](#7-database-migrations)
8. [Apply migrations](#8-apply-migrations)
9. [API contract](#9-api-contract)

---

## 1. Overview

Signup supports two paths:

| Path | How it works |
|------|----------------|
| **Email + OTP** | Member fills form → OTP emailed → verify OTP → create Supabase Auth user (service role) → upsert `public.users` + assign `member` role → auto sign-in |
| **Google OAuth** | Supabase `signInWithOAuth({ provider: "google" })` → redirect to `/auth/callback` → exchange code for session → `repairMemberAccess` creates profile/role if missing |

**Important design choice:** the `auth.users` trigger that used to insert into `public.users` under RLS is **disabled**. Profile + role creation for email signup is done in app code with the **service role**. Google OAuth users are repaired on first session via `repairMemberAccess`.

---

## 2. Environment variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # required for createUser + OTP table access

# App
NEXT_PUBLIC_APP_URL=https://portal.kitsic.in

# SMTP (OTP emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=KITSIC <noreply@example.com>
```

Supabase Dashboard also needs:

- **Auth → URL configuration**  
  - Site URL: `https://portal.kitsic.in`  
  - Redirect URLs: `https://portal.kitsic.in/auth/callback`, `http://localhost:3000/auth/callback`
- **Auth → Providers → Google** enabled (client ID/secret from Google Cloud)

---

## 3. Architecture & flows

### Email OTP signup

```
Client form
  → sendSignupOtp (server action)
      → validate fields / uniqueness
      → store hashed OTP + payload in email_otps
      → sendOtpEmail via SMTP
  → completeSignupWithOtp / POST /api/auth/complete-signup
      → verifyOtp
      → admin.auth.admin.createUser (email confirmed)
      → ensureMemberProfile (users + user_roles)
      → consumeOtp
      → signInWithPassword
```

### Google OAuth

```
Client
  → signInWithGoogle (server action)
      → supabase.auth.signInWithOAuth({ provider: "google", redirectTo: APP_URL/auth/callback })
  → Google consent
  → GET /auth/callback?code=...
      → exchangeCodeForSession(code)
      → redirect home
  → getSessionUser()
      → repairMemberAccess() if profile/role missing
```

### Data written on successful email signup

| Store | Fields |
|-------|--------|
| `auth.users` | email, password, `user_metadata` (full_name, roll_number, branch, phone) |
| `public.users` | id, email, full_name, phone, roll_number, branch, member_id (`ICnn`), avatar_color, bio, skills |
| `public.user_roles` | `member` role |
| `public.email_otps` | marked `verified = true` after use |
| `public.audit_logs` | `auth.sign_up` (best-effort) |

---

## 4. File map

| Path | Role |
|------|------|
| `apps/dashboard/features/auth/actions.ts` | Server actions: OTP send, signup complete, Google OAuth, sign-in/out |
| `apps/dashboard/lib/complete-signup.ts` | Core signup: create user, profile, role, recover existing |
| `apps/dashboard/lib/otp.ts` | Generate / hash / store / verify / consume OTP |
| `apps/dashboard/lib/email.ts` | SMTP + `sendOtpEmail` |
| `apps/dashboard/app/api/auth/complete-signup/route.ts` | HTTP POST alternative to server action |
| `apps/dashboard/app/auth/callback/route.ts` | OAuth / magic-link code exchange |
| `packages/auth/src/clients/server.ts` | Cookie-based Supabase SSR client |
| `packages/auth/src/repair-member-access.ts` | Backfill profile + member role (OAuth / edge cases) |
| `packages/database/src/supabase-admin.ts` | Service-role admin client |
| `packages/database/supabase/migrations/0001_foundation.sql` | users, roles, user_roles, trigger (later disabled) |
| `packages/database/supabase/migrations/0005_member_platform.sql` | roll/branch/member_id, `email_otps`, `generate_member_id` |
| `packages/database/supabase/migrations/0007_member_ids_and_points.sql` | member ID format `IC01`… |
| `packages/database/supabase/migrations/0008_fix_signup_trigger.sql` | Drop broken trigger; service_role policies |

---

## 5. Supabase / Google setup

### Google OAuth (Supabase Auth — member login)

This is **not** the Google Calendar Meet integration. For signup/login:

1. Google Cloud → OAuth client (Web)
2. Authorized redirect URIs must include Supabase’s callback, e.g.  
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. Paste Client ID / Secret into Supabase → Auth → Google
4. App redirect after login: `NEXT_PUBLIC_APP_URL/auth/callback`

### Email confirmations

Email OTP signup uses `email_confirm: true` via Admin API, so Supabase’s “Confirm email” setting does not block first login after OTP verification.

---

## 6. Backend code

### 6.1 Server actions — `features/auth/actions.ts`

```typescript
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

/** First call without otp → send OTP; second call with otp → complete signup */
export async function signUpWithEmail(formData: FormData): Promise<AuthResult> {
  const otp = (formData.get("otp") as string)?.trim();
  if (otp) return completeSignupWithOtp(formData);
  return sendSignupOtp(formData);
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  if (data.url) return { success: true, redirectTo: data.url };
  return { error: "Could not start Google sign-in." };
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
  if (error) return { error: error.message };
  return { success: true, message: "Check your email for the magic link." };
}
```

### 6.2 Complete signup — `lib/complete-signup.ts`

```typescript
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
  if (roleError) throw new Error(`Could not assign member role: ${roleError.message}`);
}

async function signInAfterSignup(email: string, password: string): Promise<SignupResult> {
  const supabase = await createServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInError) return { success: true, redirectTo: "/" };
  return {
    success: true,
    redirectTo: "/login",
    message: `Account created! Sign in with your roll number or email. (${signInError.message})`,
  };
}

export async function runCompleteSignup(formData: FormData): Promise<SignupResult> {
  let otpId: string | null = null;

  try {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const otp = (formData.get("otp") as string)?.trim();
    if (!email || !otp) return { error: "Email and verification code are required." };

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
      // recoverExistingSignupUser path omitted here for brevity — see repo file
      return { error: createError.message };
    }

    const userId = createData.user?.id;
    if (!userId) return { error: "Account creation failed: Supabase returned no user id." };

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
      // non-blocking
    }

    if (otpId) await consumeOtp(otpId);
    return signInAfterSignup(email, password);
  } catch (err) {
    return { error: toActionErrorMessage(err, "Verification failed. Please try again.") };
  }
}
```

> Full file also includes `recoverExistingSignupUser` when Auth already has the email (422 / “already registered”).

### 6.3 OTP store — `lib/otp.ts`

```typescript
import { createHash, randomInt } from "node:crypto";
import { createAdminClient } from "@kitsic/database";

const OTP_TTL_MS = 10 * 60 * 1000;

function hashOtp(otp: string) {
  return createHash("sha256").update(otp).digest("hex");
}

export function generateOtp() {
  return String(randomInt(100000, 999999));
}

export async function storeOtp(email: string, payload: Record<string, unknown>) {
  const supabase = createAdminClient();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await supabase.from("email_otps").delete().eq("email", email.toLowerCase());

  const { error } = await supabase.from("email_otps").insert({
    email: email.toLowerCase(),
    otp_hash: hashOtp(otp),
    payload,
    expires_at: expiresAt,
    verified: false,
  });

  if (error) throw new Error(error.message);
  return otp;
}

export async function verifyOtp(email: string, otp: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_otps")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { ok: false as const, error: "No verification code found. Request a new one." };
  if (new Date(data.expires_at) < new Date()) return { ok: false as const, error: "Verification code expired." };
  if (data.otp_hash !== hashOtp(otp)) return { ok: false as const, error: "Invalid verification code." };

  return { ok: true as const, otpId: data.id as string, payload: (data.payload ?? {}) as Record<string, unknown> };
}

export async function consumeOtp(otpId: string) {
  const supabase = createAdminClient();
  await supabase.from("email_otps").update({ verified: true }).eq("id", otpId);
}
```

### 6.4 OTP email — `lib/email.ts` (excerpt)

```typescript
import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, otp: string) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Your KITSIC verification code",
    text: `Your KITSIC verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  });

  return { ok: true as const };
}
```

### 6.5 HTTP complete-signup — `app/api/auth/complete-signup/route.ts`

```typescript
import { runCompleteSignup } from "@/lib/complete-signup";
import { toActionErrorMessage } from "@/lib/action-error";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await runCompleteSignup(formData);
    if (result.error) return Response.json({ error: result.error }, { status: 400 });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: toActionErrorMessage(err, "Signup failed unexpectedly. Please try again.") },
      { status: 500 },
    );
  }
}
```

### 6.6 OAuth callback — `app/auth/callback/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@kitsic/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

### 6.7 Server Supabase client — `packages/auth/src/clients/server.ts`

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — ignore
          }
        },
      },
    },
  );
}
```

### 6.8 Admin client — `packages/database/src/supabase-admin.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
```

### 6.9 OAuth / missing-profile repair — `packages/auth/src/repair-member-access.ts`

```typescript
import { createAdminClient } from "@kitsic/database";

interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

/** Called from getSessionUser — ensures Google OAuth users get profile + member role */
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
    if (memberIdError) return false;

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

    if (profileError) return false;
  }

  if (!hasRole) {
    const { data: memberRole } = await admin.from("roles").select("id").eq("slug", "member").maybeSingle();
    if (!memberRole?.id) return false;

    const { error: roleError } = await admin.from("user_roles").upsert(
      { user_id: authUser.id, role_id: memberRole.id },
      { onConflict: "user_id,role_id" },
    );
    if (roleError) return false;
  }

  return true;
}
```

---

## 7. Database migrations

Signup-related SQL only (excerpted / consolidated from repo migrations).

### 7.1 Foundation — users, roles, user_roles (`0001_foundation.sql`)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, -- equals auth.users.id
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  department_id UUID,
  bio TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON users FOR SELECT
  USING (auth.uid() = id OR public.user_has_permission(auth.uid(), 'members.read'));

CREATE POLICY users_update_own ON users FOR UPDATE
  USING (auth.uid() = id OR public.user_has_permission(auth.uid(), 'members.update'));

CREATE POLICY user_roles_select ON user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.user_has_permission(auth.uid(), 'roles.read'));
```

> Originally this migration also created `on_auth_user_created` → `handle_new_user()`. That trigger is removed in `0008` because RLS blocked inserts during Auth signup.

### 7.2 Member platform — profile fields + OTP (`0005_member_platform.sql`)

```sql
CREATE SEQUENCE IF NOT EXISTS member_id_seq START 1;

ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS member_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#033565';
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS users_roll_number_idx ON users(roll_number) WHERE roll_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_member_id_idx ON users(member_id) WHERE member_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  seq_val := nextval('member_id_seq');
  RETURN 'IC' || lpad(seq_val::text, 2, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps(email);
```

### 7.3 Member ID helper refresh (`0007_member_ids_and_points.sql`)

```sql
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  seq_val := nextval('member_id_seq');
  RETURN 'IC' || lpad(seq_val::text, 2, '0');
END;
$$ LANGUAGE plpgsql;
```

### 7.4 Fix signup trigger + service role policies (`0008_fix_signup_trigger.sql`)

```sql
-- Signup was failing with "Database error creating new user" because the
-- auth.users trigger could not insert into public.users / user_roles under RLS.
-- Profile + role assignment is handled in app code via service role after createUser.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Hardened function kept for optional manual re-enable; trigger stays OFF.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_role_id UUID;
  meta JSONB;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  INSERT INTO public.users (
    id, email, full_name, avatar_url, phone, roll_number, branch, member_id, avatar_color, bio
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'full_name', meta->>'name'),
    meta->>'avatar_url',
    meta->>'phone',
    meta->>'roll_number',
    meta->>'branch',
    public.generate_member_id(),
    COALESCE(meta->>'avatar_color', '#033565'),
    CASE
      WHEN meta->>'roll_number' IS NOT NULL AND meta->>'branch' IS NOT NULL
      THEN 'Roll No: ' || (meta->>'roll_number') || ' · ' || (meta->>'branch')
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO member_role_id FROM public.roles WHERE slug = 'member' LIMIT 1;
  IF member_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, member_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS users_service_all ON public.users;
CREATE POLICY users_service_all ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS user_roles_service_all ON public.user_roles;
CREATE POLICY user_roles_service_all ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 7.5 Seed requirement

After migrations, seed at least the `member` role (and permissions) via:

```bash
npm run db:seed
```

Without `roles.slug = 'member'`, `ensureMemberProfile` / `repairMemberAccess` will fail.

---

## 8. Apply migrations

From repo root (requires `DATABASE_URL`):

```bash
npm run db:migrate              # foundation if needed
npm run db:migrate:platform     # 0005 member platform + OTP
npm run db:migrate:member-ids   # 0007
npm run db:migrate:signup-fix  # 0008 drop trigger + service policies
npm run db:seed
```

Or paste the SQL sections above into the Supabase SQL Editor in order: `0001` → `0005` → `0007` → `0008`.

---

## 9. API contract

### Send OTP (server action or form → `signUpWithEmail` without `otp`)

**Form fields:** `full_name`, `email`, `branch`, `roll_number`, `phone`, `password`, `confirm_password`

**Success:** `{ success: true, otpSent: true, message: "..." }`

### Complete signup

**POST** `/api/auth/complete-signup` (multipart / form-data)  
**or** server action with fields: `email`, `otp` (password + profile already in OTP payload)

**Success:** `{ success: true, redirectTo: "/" }`  
**Error:** `{ error: "..." }` with HTTP 400

### Google OAuth

**Server action** `signInWithGoogle()` → `{ success: true, redirectTo: "<google/supabase url>" }`  
Browser navigates to that URL → returns to `/auth/callback?code=...`

---

## Security notes

- OTPs are stored as **SHA-256 hashes**, never plaintext.
- OTP payload includes the password until verification; TTL is **10 minutes**, then row is verified/consumed.
- Prefer HTTPS + short-lived OTPs; consider encrypting OTP payload at rest if hardening further.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Google OAuth users may lack roll/branch until they complete profile later — `repairMemberAccess` only creates a minimal `member` profile.

---

*Source of truth: `apps/dashboard` auth actions + `packages/auth` / `packages/database` migrations in the KITSIC portal repo.*
