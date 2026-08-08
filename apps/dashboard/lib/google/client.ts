import "server-only";

import { createAdminClient } from "@kitsic/database";
import { google } from "googleapis";
import {
  getGoogleRedirectUri,
  GOOGLE_CALENDAR_SETTING_KEY,
  GOOGLE_OAUTH_SCOPES,
  type GoogleCalendarTokens,
} from "./config";

export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, getGoogleRedirectUri());
}

export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES,
    state,
  });
}

export async function getStoredGoogleTokens(): Promise<GoogleCalendarTokens | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", GOOGLE_CALENDAR_SETTING_KEY)
    .maybeSingle();

  if (!data?.value || typeof data.value !== "object") return null;
  const value = data.value as GoogleCalendarTokens;
  if (!value.refresh_token || !value.email) return null;
  return value;
}

export async function saveGoogleTokens(tokens: GoogleCalendarTokens): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("system_settings").upsert(
    { key: GOOGLE_CALENDAR_SETTING_KEY, value: tokens },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}

export async function clearGoogleTokens(): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("system_settings").delete().eq("key", GOOGLE_CALENDAR_SETTING_KEY);
}

export async function getGoogleCalendarStatus(): Promise<{
  connected: boolean;
  email?: string;
  connectedAt?: string;
}> {
  const tokens = await getStoredGoogleTokens();
  if (!tokens) return { connected: false };
  return {
    connected: true,
    email: tokens.email,
    connectedAt: tokens.connected_at,
  };
}

export async function getAuthenticatedGoogleClient() {
  const stored = await getStoredGoogleTokens();
  if (!stored?.refresh_token) {
    throw new Error("Google Calendar is not connected. Connect it in Settings first.");
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expiry_date: stored.expiry_date,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (!tokens.refresh_token && !tokens.access_token) return;
    const next: GoogleCalendarTokens = {
      ...stored,
      access_token: tokens.access_token ?? stored.access_token,
      refresh_token: tokens.refresh_token ?? stored.refresh_token,
      expiry_date: tokens.expiry_date ?? stored.expiry_date,
    };
    await saveGoogleTokens(next);
  });

  return oauth2Client;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleCalendarTokens> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: profile } = await oauth2.userinfo.get();

  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Disconnect and reconnect with consent.");
  }
  if (!profile.email) {
    throw new Error("Could not read Google account email.");
  }

  return {
    access_token: tokens.access_token ?? undefined,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date ?? undefined,
    email: profile.email,
    connected_by: "",
    connected_at: new Date().toISOString(),
  };
}
