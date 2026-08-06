export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;

  return Response.json({
    ok: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL
      && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      && process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    checks: {
      supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      smtpHost: Boolean(process.env.SMTP_HOST),
      appUrl,
      appUrlIsProduction: appUrl?.startsWith("https://portal.kitsic.in") ?? false,
    },
    hint: "Signup requires SUPABASE_SERVICE_ROLE_KEY on the server. Set NEXT_PUBLIC_APP_URL to https://portal.kitsic.in in production.",
  });
}
