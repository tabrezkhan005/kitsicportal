import "server-only";

import { createAdminClient } from "@kitsic/database";
import { google } from "googleapis";
import { randomBytes } from "node:crypto";
import { getAuthenticatedGoogleClient } from "./client";
import { parseMeetCode } from "./config";

export interface CreateGoogleMeetingResult {
  meetLink: string;
  googleEventId: string;
  googleMeetCode: string;
}

export async function getClubMemberEmails(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("email")
    .is("deleted_at", null)
    .order("email");

  return (data ?? []).map((row) => row.email).filter(Boolean);
}

export async function createGoogleCalendarMeeting(input: {
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
}): Promise<CreateGoogleMeetingResult> {
  const auth = await getAuthenticatedGoogleClient();
  const calendar = google.calendar({ version: "v3", auth });
  const attendeeEmails = await getClubMemberEmails();

  const event = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: input.title,
      description: input.description ?? undefined,
      start: {
        dateTime: new Date(input.startsAt).toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: new Date(input.endsAt).toISOString(),
        timeZone: "Asia/Kolkata",
      },
      attendees: attendeeEmails.map((email) => ({ email })),
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
    throw new Error("Google Calendar did not return a Meet link.");
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
}

export async function cancelGoogleCalendarMeeting(googleEventId: string): Promise<void> {
  const auth = await getAuthenticatedGoogleClient();
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({
    calendarId: "primary",
    eventId: googleEventId,
    sendUpdates: "all",
  });
}
