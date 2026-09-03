import "server-only";

import { google } from "googleapis";
import { randomBytes } from "node:crypto";
import { clearGoogleTokens, getAuthenticatedGoogleClient } from "./client";
import { parseMeetCode } from "./config";

export interface CreateGoogleMeetingResult {
  meetLink: string;
  googleEventId: string;
  googleMeetCode: string;
}

function isInvalidGrantError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("invalid_grant")) return true;
  try {
    return JSON.stringify(error).includes("invalid_grant");
  } catch {
    return false;
  }
}

async function withGoogleAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isInvalidGrantError(error)) {
      await clearGoogleTokens();
      throw new Error(
        "Google connection expired (invalid_grant). Go to Settings → Reconnect Google Calendar, then schedule again.",
      );
    }
    throw error;
  }
}

/**
 * Create a Google Calendar event with a Meet link.
 * Invites are sent by the portal SMTP to all members — we do not add every
 * member as a Google Calendar attendee (that hits Google limits / failures).
 */
export async function createGoogleCalendarMeeting(input: {
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
}): Promise<CreateGoogleMeetingResult> {
  return withGoogleAuthRetry(async () => {
    const auth = await getAuthenticatedGoogleClient();
    const calendar = google.calendar({ version: "v3", auth });

    const startIso = new Date(input.startsAt).toISOString();
    const endIso = new Date(input.endsAt).toISOString();

    if (Number.isNaN(new Date(startIso).getTime()) || Number.isNaN(new Date(endIso).getTime())) {
      throw new Error("Invalid meeting start or end time.");
    }

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "none",
      requestBody: {
        summary: input.title,
        description: [
          input.description ?? "",
          "",
          "All club members are invited via the KITSIC portal email.",
          `Portal: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.kitsic.in"}/meetings`,
        ].filter(Boolean).join("\n"),
        start: {
          dateTime: startIso,
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: endIso,
          timeZone: "Asia/Kolkata",
        },
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${randomBytes(4).toString("hex")}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetLink =
      event.data.hangoutLink
      ?? event.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri
      ?? null;

    if (!meetLink || !event.data.id) {
      throw new Error("Google Calendar did not return a Meet link. Reconnect Google in Settings and try again.");
    }

    const googleMeetCode = parseMeetCode(meetLink);
    if (!googleMeetCode) {
      throw new Error("Could not parse Google Meet code from calendar event.");
    }

    return {
      meetLink,
      googleEventId: event.data.id,
      googleMeetCode,
    };
  });
}

export async function cancelGoogleCalendarMeeting(googleEventId: string): Promise<void> {
  await withGoogleAuthRetry(async () => {
    const auth = await getAuthenticatedGoogleClient();
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
      sendUpdates: "none",
    });
  });
}
