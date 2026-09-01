"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowRight, Shield } from "lucide-react";
import { sendLeadershipSignupOtp } from "@/features/auth/actions";
import { toActionErrorMessage } from "@/lib/action-error";
import { LEADERSHIP_SIGNUP_ROLES } from "@/lib/leadership-roles";

const BRANCHES = ["CSM", "CSE", "ECE", "IT", "EEE", "CSD"] as const;

async function completeLeadershipViaApi(formData: FormData) {
  const response = await fetch("/api/auth/complete-leadership-signup", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json();
  if (!response.ok) return { error: payload.error ?? "Registration failed." };
  return payload;
}

export function LeadershipSignupForm() {
  const router = useRouter();
  const [otpStep, setOtpStep] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        if (!otpStep) {
          const email = (formData.get("email") as string)?.trim();
          const result = await sendLeadershipSignupOtp(formData);
          if (result?.error) {
            setError(toActionErrorMessage(result.error));
            return;
          }
          setSignupEmail(email);
          setRoleSlug((formData.get("role_slug") as string) ?? "");
          setInviteCode((formData.get("invite_code") as string) ?? "");
          setOtpStep(true);
          setMessage(result.message ?? "Verification code sent.");
          return;
        }

        formData.set("email", signupEmail);
        formData.set("role_slug", roleSlug);
        formData.set("invite_code", inviteCode);

        const result = await completeLeadershipViaApi(formData);
        if (result.error) {
          setError(result.error);
          return;
        }

        router.push(result.redirectTo ?? "/");
        router.refresh();
      } catch {
        setError("Registration failed. Please try again.");
      }
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <GrainGradient className="pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="KITSIC" width={56} height={56} className="mx-auto mb-4" />
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5 text-accent" />
            Leadership registration
          </div>
          <h1 className="font-display text-2xl font-bold text-primary">Head signup</h1>
          <p className="mt-2 text-sm text-muted">
            For Gen 4 leadership only. You need a role-specific invite code from the President.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="dashboard-card space-y-4 p-6">
          {!otpStep ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary" htmlFor="role_slug">Your role</label>
                <select
                  id="role_slug"
                  name="role_slug"
                  required
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select leadership role…</option>
                  {LEADERSHIP_SIGNUP_ROLES.map((role) => (
                    <option key={role.slug} value={role.slug}>{role.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary" htmlFor="invite_code">Invite code</label>
                <input
                  id="invite_code"
                  name="invite_code"
                  required
                  placeholder="e.g. KITSIC-VP-26"
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary" htmlFor="full_name">Full name</label>
                <input id="full_name" name="full_name" required className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary" htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-primary" htmlFor="roll_number">Roll number (optional)</label>
                  <input id="roll_number" name="roll_number" className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-primary" htmlFor="branch">Branch</label>
                  <select id="branch" name="branch" className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="">Select…</option>
                    {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary" htmlFor="phone">Phone</label>
                <input id="phone" name="phone" required className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-primary" htmlFor="password">Password</label>
                  <input id="password" name="password" type="password" required minLength={8} className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-primary" htmlFor="confirm_password">Confirm</label>
                  <input id="confirm_password" name="confirm_password" type="password" required className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                Code sent to <strong className="text-primary">{signupEmail}</strong> for{" "}
                <strong className="text-primary">{LEADERSHIP_SIGNUP_ROLES.find((r) => r.slug === roleSlug)?.label}</strong>
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary" htmlFor="otp">Verification code</label>
                <input
                  id="otp"
                  name="otp"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  className="flex h-12 w-full rounded-lg border border-border bg-background px-3 text-center font-mono text-lg tracking-[0.4em]"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-muted">{message}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white"
          >
            {isPending ? "Please wait…" : otpStep ? "Complete registration" : "Send verification code"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-primary underline-offset-2 hover:underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/login?mode=signup" className="font-semibold text-primary underline-offset-2 hover:underline">
            Member signup
          </Link>
        </p>
      </div>
    </div>
  );
}
