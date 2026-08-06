import { createAdminClient } from "@kitsic/database";
import { toActionErrorMessage } from "@/lib/action-error";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;
  const checks = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    smtpHost: Boolean(process.env.SMTP_HOST),
    appUrl,
    appUrlIsProduction: appUrl?.startsWith("https://portal.kitsic.in") ?? false,
  };

  let adminAuthOk = false;
  let emailOtpsOk = false;
  let adminAuthError: string | null = null;
  let emailOtpsError: string | null = null;

  if (checks.supabaseServiceRoleKey) {
    try {
      const admin = createAdminClient();
      const [{ error: authError }, { error: otpError }] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
        admin.from("email_otps").select("id", { count: "exact", head: true }),
      ]);

      adminAuthOk = !authError;
      emailOtpsOk = !otpError;
      if (authError) adminAuthError = authError.message;
      if (otpError) emailOtpsError = otpError.message;
    } catch (err) {
      adminAuthError = toActionErrorMessage(err, "Admin client failed");
    }
  }

  const ok = checks.supabaseUrl
    && checks.supabaseAnonKey
    && checks.supabaseServiceRoleKey
    && adminAuthOk
    && emailOtpsOk;

  return Response.json({
    ok,
    checks: {
      ...checks,
      adminAuthOk,
      emailOtpsOk,
    },
    errors: {
      adminAuth: adminAuthError,
      emailOtps: emailOtpsError,
    },
    hint: ok
      ? "Auth configuration looks good."
      : "Fix false checks above. Signup needs SUPABASE_SERVICE_ROLE_KEY and the email_otps table (run db:migrate:platform).",
  });
}
