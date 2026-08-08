import { createServerClient } from "@kitsic/auth";
import { requirePermission } from "@kitsic/auth";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google/client";

export async function GET() {
  try {
    await requirePermission("settings.manage");
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings?google=error&reason=forbidden`);
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
  }

  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(getGoogleAuthUrl(state));
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("google_oauth_user", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
