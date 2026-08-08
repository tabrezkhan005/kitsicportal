import { createServerClient } from "@kitsic/auth";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, saveGoogleTokens } from "@/lib/google/client";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectBase = `${appUrl}/settings`;

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("google_oauth_state")?.value;
  const storedUserId = request.cookies.get("google_oauth_user")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${redirectBase}?google=error&reason=invalid_state`);
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== storedUserId) {
    return NextResponse.redirect(`${redirectBase}?google=error&reason=session`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    tokens.connected_by = user.id;
    await saveGoogleTokens(tokens);

    const response = NextResponse.redirect(`${redirectBase}?google=connected`);
    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_user");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "connect_failed";
    return NextResponse.redirect(`${redirectBase}?google=error&reason=${encodeURIComponent(message)}`);
  }
}
