"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useRef, useEffect, type ReactNode, type FormEvent } from "react";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import {
  signInWithUsername,
  sendSignupOtp,
  sendPasswordResetOtp,
  resetPasswordWithOtp,
} from "@/features/auth/actions";
import { toActionErrorMessage } from "@/lib/action-error";

async function completeSignupViaApi(formData: FormData) {
  const response = await fetch("/api/auth/complete-signup", {
    method: "POST",
    body: formData,
  });

  let payload: { error?: string; success?: boolean; redirectTo?: string; message?: string } | null = null;
  try {
    payload = await response.json();
  } catch {
    return { error: "Signup server returned an invalid response. Redeploy the app and try again." };
  }

  if (!response.ok) {
    return { error: payload?.error ?? `Signup failed (HTTP ${response.status}).` };
  }

  return payload ?? { error: "Signup failed with no response." };
}

type AuthMode = "signin" | "signup" | "forgot";

const BRANCHES = ["CSM", "CSE", "ECE", "IT", "EEE", "CSD"] as const;

const termsText = (
  <>
    By creating an account, you agree to our{" "}
    <a href="#" className="font-ui font-semibold text-primary/70 underline underline-offset-2 hover:text-accent">
      Terms
    </a>{" "}
    and{" "}
    <a href="#" className="font-ui font-semibold text-primary/70 underline underline-offset-2 hover:text-accent">
      Privacy Policy
    </a>
  </>
);

const fadeSlide = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function AuthSectionOne() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [branch, setBranch] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [forgotOtpStep, setForgotOtpStep] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isSignUp = mode === "signup";
  const isForgot = mode === "forgot";

  function switchMode(next: AuthMode) {
    setMode(next);
    setBranch("");
    setSignupEmail("");
    setForgotEmail("");
    setOtpStep(false);
    setForgotOtpStep(false);
    setError(null);
    setMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.set("redirect", redirect);

    startTransition(async () => {
      try {
        if (isForgot) {
          if (!forgotOtpStep) {
            const result = await sendPasswordResetOtp(formData);
            if (result?.error) {
              setError(toActionErrorMessage(result.error, "Could not send reset code."));
              return;
            }
            if (result.email) setForgotEmail(result.email);
            setForgotOtpStep(true);
            setMessage(result.message ?? "Reset code sent.");
            return;
          }

          const result = await resetPasswordWithOtp(formData);
          if (result?.error) {
            setError(toActionErrorMessage(result.error, "Could not reset password."));
            return;
          }
          setMessage(result.message ?? "Password updated.");
          if (result.redirectTo) {
            switchMode("signin");
            setMessage("Password updated. Sign in with your new password.");
          }
          return;
        }

        if (isSignUp && !otpStep) {
          const email = (formData.get("email") as string)?.trim();
          const result = await sendSignupOtp(formData);
          if (result?.error) {
            setError(toActionErrorMessage(result.error, "Could not send verification code."));
            return;
          }
          setSignupEmail(email);
          setOtpStep(true);
          setMessage(result.message ?? "Verification code sent.");
          return;
        }

        const result = isSignUp
          ? await completeSignupViaApi(formData)
          : await signInWithUsername(formData);

        if (!result) {
          setError(
            isSignUp
              ? "Signup request failed. Redeploy the app and confirm SUPABASE_SERVICE_ROLE_KEY is set on Vercel."
              : "Sign-in request failed. Please try again.",
          );
          return;
        }

        if (result.error) {
          setError(typeof result.error === "string" ? result.error : toActionErrorMessage(
            result.error,
            isSignUp
              ? "Signup failed unexpectedly. Try again or request a new verification code."
              : "Sign-in failed. Check your username and password.",
          ));
          return;
        }

        if (result?.message) {
          setMessage(result.message);
          if (result.success && result.redirectTo) {
            router.push(result.redirectTo);
            router.refresh();
          }
          return;
        }

        if (result?.success && result.redirectTo) {
          router.push(result.redirectTo);
          router.refresh();
        }
      } catch (err) {
        setError(toActionErrorMessage(err, "Verification failed. Please check your code or request a new one."));
      }
    });
  }

  return (
    <section className="auth-grid-bg auth-shell relative min-h-[100dvh] overflow-hidden text-primary">
      <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />

      <div className="auth-shell relative grid min-h-[100dvh] gap-0 lg:grid-cols-[1fr_1.08fr]">
        <div className="flex min-h-0 items-center justify-center px-3 py-2 sm:px-6 lg:px-10">
          <div className="auth-card auth-card-shadow flex max-h-[calc(100dvh-1rem)] w-full max-w-[440px] flex-col rounded-2xl border border-primary/10 bg-white/95 backdrop-blur-sm">
            {/* Fixed header */}
            <div className="auth-card-header shrink-0 px-4 pt-4 sm:px-7 sm:pt-6">
              <div className="mb-3 flex flex-col items-center text-center sm:mb-4">
                <Image
                  src="/logo/bgic.png"
                  alt="KITS Innovation Club"
                  width={160}
                  height={200}
                  className="auth-logo h-16 w-auto max-w-[140px] object-contain sm:h-20 sm:max-w-[160px]"
                  priority
                />
                <span className="auth-badge font-mono-brand mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/3 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-primary/60">
                  <Sparkles className="h-3 w-3 text-accent" />
                  KITS Guntur
                </span>
              </div>

              <div className="relative mb-4 flex rounded-xl border border-primary/10 bg-[#f8fafc] p-1">
                {!isForgot && (
                  <>
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-primary shadow-sm"
                      style={{ left: isSignUp ? "calc(50% + 2px)" : "4px" }}
                    />
                    <button
                      type="button"
                      onClick={() => switchMode("signin")}
                      className={[
                        "relative z-10 flex-1 rounded-lg py-2 text-sm font-semibold transition-colors duration-300 font-ui",
                        !isSignUp ? "text-white" : "text-primary/50 hover:text-primary/80",
                      ].join(" ")}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className={[
                        "relative z-10 flex-1 rounded-lg py-2 text-sm font-semibold transition-colors duration-300 font-ui",
                        isSignUp ? "text-white" : "text-primary/50 hover:text-primary/80",
                      ].join(" ")}
                    >
                      Sign up
                    </button>
                  </>
                )}
                {isForgot && (
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="w-full rounded-lg py-2 text-sm font-semibold text-primary/70 transition-colors hover:text-primary font-ui"
                  >
                    ← Back to sign in
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="mb-2 text-center sm:mb-3"
                >
                  <h1 className="auth-title font-auth-display text-xl font-extrabold leading-tight tracking-[-0.03em] text-primary sm:text-[1.75rem]">
                    {isForgot ? "Reset password" : isSignUp ? "Join the club" : "Welcome back"}
                  </h1>
                  <p className="auth-subtitle mt-1 font-body text-xs leading-relaxed text-primary/55 sm:text-sm">
                    {isForgot
                      ? "We will email you a code to set a new password"
                      : isSignUp
                        ? "Create your account to access the Innovation Club dashboard"
                        : "Sign in to your KITSIC dashboard"}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Scrollable form fields */}
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="auth-form-scroll auth-form-body min-h-0 flex-1 overflow-y-auto px-4 sm:px-7">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    variants={fadeSlide}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-2 pb-1"
                  >
                    {isForgot ? (
                      <div className="space-y-2">
                        {!forgotOtpStep ? (
                          <FieldBox
                            label="Email or roll number"
                            name="identifier"
                            required
                            placeholder="you@college.edu or 21BCE1234"
                            mono
                            compact
                          />
                        ) : (
                          <>
                            <p className="rounded-lg border border-[var(--dashboard-border)] bg-[#f3f6f9] px-3 py-2 font-body text-xs text-muted">
                              Reset code sent to <span className="font-semibold text-primary">{forgotEmail}</span>
                            </p>
                            <input type="hidden" name="email" value={forgotEmail} />
                            <FieldBox label="Reset code" name="otp" required placeholder="6-digit code" mono compact />
                            <FieldBox label="New password" name="password" type="password" required compact />
                            <FieldBox label="Confirm new password" name="confirm_password" type="password" required compact />
                          </>
                        )}
                      </div>
                    ) : isSignUp ? (
                      <div className={!otpStep ? "auth-signup-grid space-y-2 sm:space-y-0" : "space-y-2"}>
                        {!otpStep ? (
                          <>
                            <div className="auth-field-compact">
                              <FieldBox label="Full name" name="full_name" required compact />
                            </div>
                            <div className="auth-field-compact">
                              <FieldBox label="Roll number" name="roll_number" required placeholder="21BCE1234" mono compact />
                            </div>
                            <div className="auth-field-compact auth-span-2">
                              <BranchSelect name="branch" value={branch} onChange={setBranch} required options={BRANCHES} />
                            </div>
                            <div className="auth-field-compact">
                              <FieldBox label="Email" name="email" type="email" required compact />
                            </div>
                            <div className="auth-field-compact">
                              <FieldBox label="Phone number" name="phone" type="tel" required placeholder="+91 9876543210" compact />
                            </div>
                            <div className="auth-field-compact">
                              <FieldBox label="Password" name="password" type="password" required compact />
                            </div>
                            <div className="auth-field-compact">
                              <FieldBox label="Confirm password" name="confirm_password" type="password" required compact />
                            </div>
                            <div className="auth-span-2 font-body text-[10px] leading-relaxed text-primary/45 sm:text-[11px]">
                              <CheckboxLine>{termsText}</CheckboxLine>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="rounded-lg border border-[var(--dashboard-border)] bg-[#f3f6f9] px-3 py-2 font-body text-xs text-muted">
                              Code sent to <span className="font-semibold text-primary">{signupEmail}</span>
                            </p>
                            <input type="hidden" name="email" value={signupEmail} />
                            <FieldBox label="Verification code" name="otp" required placeholder="6-digit code" mono compact />
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <FieldBox label="Username" name="username" required placeholder="Roll no. or email" mono compact />
                        <FieldBox label="Password" name="password" type="password" required compact />
                        <p className="text-right">
                          <button
                            type="button"
                            onClick={() => switchMode("forgot")}
                            className="font-body text-xs font-semibold text-accent underline-offset-2 hover:underline"
                          >
                            Forgot password?
                          </button>
                        </p>
                      </>
                    )}

                    {error && (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-600">
                        {error}
                      </p>
                    )}
                    {message && (
                      <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 font-body text-sm text-teal-700">
                        {message}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Fixed footer with submit */}
              <div className="auth-form-footer shrink-0 border-t border-primary/5 px-4 py-3 sm:px-7 sm:py-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="group flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary font-ui text-sm font-semibold text-white transition-all hover:bg-secondary hover:shadow-lg hover:shadow-primary/20 disabled:opacity-60 sm:h-11"
                >
                  {isPending ? (
                    "Please wait…"
                  ) : (
                    <>
                      {isForgot
                        ? forgotOtpStep
                          ? "Update password"
                          : "Send reset code"
                        : isSignUp
                          ? otpStep
                            ? "Verify & create account"
                            : "Send verification code"
                          : "Sign in"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
                <p className="auth-institute mt-2 text-center font-body text-[10px] text-primary/40">
                  KKR &amp; KSR Institute of Technology and Sciences
                </p>
                {!isForgot && (
                  <p className="mt-3 text-center font-body text-xs text-primary/50">
                    Leadership head?{" "}
                    <a href="/signup/leadership" className="font-semibold text-accent underline-offset-2 hover:underline">
                      Register here
                    </a>
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Hero panel */}
        <div className="auth-hero-glow relative hidden h-full overflow-hidden bg-primary lg:block">
          <GrainGradient
            speed={0.8}
            scale={1.1}
            rotation={0}
            offsetX={0}
            offsetY={0}
            softness={0.55}
            intensity={0.45}
            noise={0.2}
            shape="corners"
            frame={2854.5}
            colors={["#fefefe", "#faa109", "#044a8a", "#fefefe"]}
            colorBack="#00000000"
            className="absolute inset-0 bg-primary"
          />

          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute left-[12%] top-0 h-full w-px bg-gradient-to-b from-transparent via-white to-transparent" />
            <div className="absolute right-[18%] top-0 h-full w-px bg-gradient-to-b from-transparent via-white/50 to-transparent" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
            <div>
              <p className="font-mono-brand mb-6 text-[11px] font-medium uppercase tracking-[0.25em] text-white/50">
                Innovation Club · Dashboard
              </p>
              <h2 className="font-auth-display text-[3.25rem] font-extrabold leading-[0.95] tracking-[-0.04em] text-white xl:text-[4.5rem]">
                Ideate
                <br />
                <span className="text-white/90">Innovate</span>
                <br />
                <span className="bg-gradient-to-r from-accent to-[#ffd080] bg-clip-text text-transparent">
                  Impact
                </span>
              </h2>
            </div>

            <div className="space-y-4">
              <p className="max-w-md font-body text-base leading-relaxed text-white/70">
                Build future-ready engineers through talks, workshops, hackathons, and high-impact collaborations.
              </p>
              <div className="flex gap-3">
                {["Tasks", "Events", "Analytics"].map((tag) => (
                  <span
                    key={tag}
                    className="font-ui rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FieldBox({
  label,
  name,
  type = "text",
  required,
  placeholder,
  mono,
  compact,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
  compact?: boolean;
}) {
  const inputClass = [
    "auth-input-glow w-full rounded-xl border border-primary/12 bg-white px-3.5 text-sm text-primary outline-none transition-all",
    "placeholder:text-primary/30 focus:border-accent/60",
    mono ? "font-mono-brand tracking-wide" : "font-body",
    compact ? "h-10" : "h-11",
  ].join(" ");

  return (
    <label className="block">
      <span className="mb-1 block font-ui text-[11px] font-semibold tracking-wide text-primary/70">
        {label}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function BranchSelect({
  name,
  value,
  onChange,
  required,
  options,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  options: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <span className="mb-1 block font-ui text-[11px] font-semibold tracking-wide text-primary/70">
        Branch
      </span>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "auth-input-glow flex h-10 w-full items-center justify-between rounded-xl border bg-white px-3.5 text-sm outline-none transition-all font-body",
          open ? "border-accent/60" : "border-primary/12",
          value ? "text-primary" : "text-primary/30",
        ].join(" ")}
      >
        <span>{value || "Select branch"}</span>
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 text-primary/40 transition-transform duration-200",
            open ? "rotate-180 text-accent" : "",
          ].join(" ")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-primary/10 bg-white p-1 shadow-[0_8px_24px_rgba(3,53,101,0.12)]"
            role="listbox"
          >
            {options.map((option) => {
              const isSelected = value === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors font-ui",
                    isSelected
                      ? "bg-primary text-white"
                      : "text-primary/80 hover:bg-primary/5 hover:text-primary",
                  ].join(" ")}
                >
                  <span className="font-semibold tracking-wide">{option}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckboxLine({ children }: { children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <span className="relative mt-0.5 size-4 shrink-0">
        <input
          type="checkbox"
          required
          className="peer size-full cursor-pointer appearance-none rounded border border-primary/20 bg-white transition-colors checked:border-primary checked:bg-primary"
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute inset-0 hidden size-full p-0.5 text-white peer-checked:block"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 6.2 5 8.1 9 3.9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}
