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

  // Proactively refresh so we surface invalid_grant before Calendar API calls.
  try {
    const needsRefresh =
      !stored.expiry_date
      || stored.expiry_date < Date.now() + 60_000
      || !stored.access_token;

    if (needsRefresh) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await saveGoogleTokens({
        ...stored,
        access_token: credentials.access_token ?? stored.access_token,
        refresh_token: credentials.refresh_token ?? stored.refresh_token,
        expiry_date: credentials.expiry_date ?? stored.expiry_date,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isInvalidGrant =
      message.includes("invalid_grant")
      || (typeof error === "object" && error !== null && "response" in error && JSON.stringify(error).includes("invalid_grant"));

    if (isInvalidGrant) {
      await clearGoogleTokens();
      throw new Error(
        "Google connection expired (invalid_grant). Go to Settings → Disconnect/Reconnect Google Calendar, then schedule again.",
      );
    }
    throw error instanceof Error ? error : new Error(message);
  }

  return oauth2Client;
}

function readEmailFromIdToken(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    const data = JSON.parse(json) as { email?: string };
    return data.email;
  } catch {
    return undefined;
  }
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleCalendarTokens> {
  const redirectUri = getGoogleRedirectUri();
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken({ code, redirect_uri: redirectUri });
  oauth2Client.setCredentials(tokens);

  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Disconnect and reconnect with consent.");
  }

  let email = tokens.id_token ? readEmailFromIdToken(tokens.id_token) : undefined;

  if (!email) {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();
    email = profile.email ?? undefined;
  }

  if (!email) {
    throw new Error("Could not read Google account email. Add openid and email scopes in Google Cloud Console.");
  }

  return {
    access_token: tokens.access_token ?? undefined,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date ?? undefined,
    email,
    connected_by: "",
    connected_at: new Date().toISOString(),
  };
}
