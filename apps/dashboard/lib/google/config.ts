import "server-only";

export const GOOGLE_CALENDAR_SETTING_KEY = "google_calendar";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/meetings.space.readonly",
];

export interface GoogleCalendarTokens {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  email: string;
  connected_by: string;
  connected_at: string;
}

export function getGoogleRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI
    ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/google/callback`
  );
}

export function parseMeetCode(meetLink: string | null | undefined): string | null {
  if (!meetLink) return null;
  const match = meetLink.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function normalizePersonName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Minimum stay to count as fully present — 50% of meeting length or 15 minutes, capped at 45. */
export function computePresentThresholdMinutes(meetingStartsAt: string, meetingEndsAt: string | null): number {
  const start = new Date(meetingStartsAt).getTime();
  const end = meetingEndsAt
    ? new Date(meetingEndsAt).getTime()
    : start + 60 * 60 * 1000;
  const meetingMinutes = Math.max(15, Math.round((end - start) / 60000));
  return Math.min(45, Math.max(15, Math.round(meetingMinutes * 0.5)));
}

export function deriveAttendanceStatus(durationMinutes: number, thresholdMinutes: number): "present" | "partial" {
  return durationMinutes >= thresholdMinutes ? "present" : "partial";
}
