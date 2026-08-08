import "server-only";

import { createAdminClient } from "@kitsic/database";
import { google } from "googleapis";
import {
  computePresentThresholdMinutes,
  deriveAttendanceStatus,
  normalizePersonName,
  parseMeetCode,
} from "./config";
import { getAuthenticatedGoogleClient } from "./client";

interface PortalUser {
  id: string;
  email: string;
  full_name: string | null;
}

function matchParticipantToUser(
  displayName: string | null | undefined,
  users: PortalUser[],
): PortalUser | null {
  if (!displayName) return null;
  const normalized = normalizePersonName(displayName);
  if (!normalized) return null;

  const exact = users.find((user) => user.full_name && normalizePersonName(user.full_name) === normalized);
  if (exact) return exact;

  const emailMatch = users.find((user) => normalized.includes(user.email.split("@")[0]?.toLowerCase() ?? ""));
  return emailMatch ?? null;
}

function computeDurationMinutes(joinedAt: string, leftAt: string | null, fallbackEnd: string): number {
  const start = new Date(joinedAt).getTime();
  const end = leftAt ? new Date(leftAt).getTime() : new Date(fallbackEnd).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

async function loadPortalUsers(): Promise<PortalUser[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id, email, full_name")
    .is("deleted_at", null);
  return data ?? [];
}

async function upsertMeetingAttendance(input: {
  meetingId: string;
  userId: string;
  joinedAt: string;
  leftAt: string | null;
  durationMinutes: number;
  status: "present" | "partial";
  source: "google" | "portal";
  thresholdMinutes: number;
}): Promise<void> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, joined_at, left_at, duration_minutes, source")
    .eq("meeting_id", input.meetingId)
    .eq("user_id", input.userId)
    .maybeSingle();

  const mergedJoinedAt = existing?.joined_at
    ? new Date(existing.joined_at) < new Date(input.joinedAt) ? existing.joined_at : input.joinedAt
    : input.joinedAt;

  const mergedLeftAt = (() => {
    const candidates = [existing?.left_at, input.leftAt].filter(Boolean) as string[];
    if (candidates.length === 0) return null;
    return candidates.reduce((latest, value) =>
      new Date(value) > new Date(latest) ? value : latest,
    );
  })();

  const mergedDuration = Math.max(existing?.duration_minutes ?? 0, input.durationMinutes);
  const mergedStatus = deriveAttendanceStatus(mergedDuration, input.thresholdMinutes);

  const payload = {
    user_id: input.userId,
    meeting_id: input.meetingId,
    status: mergedStatus,
    joined_at: mergedJoinedAt,
    left_at: mergedLeftAt,
    duration_minutes: mergedDuration,
    source: existing?.source === "portal" && input.source === "google" ? "google" : input.source,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from("attendance_records").update(payload).eq("id", existing.id);
    return;
  }

  await supabase.from("attendance_records").insert(payload);
}

export async function syncMeetingAttendanceFromGoogle(meetingId: string): Promise<{
  synced: number;
  conferenceFound: boolean;
}> {
  const supabase = createAdminClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, starts_at, ends_at, meet_link, google_meet_code, conference_record_name")
    .eq("id", meetingId)
    .single();

  if (!meeting) throw new Error("Meeting not found.");

  const meetCode = meeting.google_meet_code ?? parseMeetCode(meeting.meet_link);
  if (!meetCode) throw new Error("Meeting has no Google Meet code.");

  const auth = await getAuthenticatedGoogleClient();
  const meet = google.meet({ version: "v2", auth });

  let conferenceName = meeting.conference_record_name;
  if (!conferenceName) {
    const { data: records } = await meet.conferenceRecords.list({
      filter: `space.meeting_code="${meetCode}"`,
      pageSize: 5,
    });
    conferenceName = records.conferenceRecords?.[0]?.name ?? null;
  }

  if (!conferenceName) {
    return { synced: 0, conferenceFound: false };
  }

  const users = await loadPortalUsers();
  const threshold = computePresentThresholdMinutes(meeting.starts_at, meeting.ends_at);
  let synced = 0;

  let pageToken: string | undefined;
  do {
    const { data: participantsPage } = await meet.conferenceRecords.participants.list({
      parent: conferenceName,
      pageSize: 100,
      pageToken,
    });

    for (const participant of participantsPage.participants ?? []) {
      const joinedAt = participant.earliestStartTime;
      if (!joinedAt) continue;

      const displayName = participant.signedinUser?.displayName ?? participant.anonymousUser?.displayName;
      const matchedUser = matchParticipantToUser(displayName, users);
      if (!matchedUser) continue;

      const leftAt = participant.latestEndTime ?? null;
      const durationMinutes = computeDurationMinutes(
        joinedAt,
        leftAt,
        meeting.ends_at ?? new Date().toISOString(),
      );

      await upsertMeetingAttendance({
        meetingId: meeting.id,
        userId: matchedUser.id,
        joinedAt,
        leftAt,
        durationMinutes,
        status: deriveAttendanceStatus(durationMinutes, threshold),
        source: "google",
        thresholdMinutes: threshold,
      });
      synced += 1;
    }

    pageToken = participantsPage.nextPageToken ?? undefined;
  } while (pageToken);

  await supabase
    .from("meetings")
    .update({
      conference_record_name: conferenceName,
      attendance_synced_at: new Date().toISOString(),
      google_meet_code: meetCode,
    })
    .eq("id", meeting.id);

  return { synced, conferenceFound: true };
}

export async function syncRecentMeetingsFromGoogle(limit = 10): Promise<{ meetingsProcessed: number; totalSynced: number }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id")
    .eq("status", "scheduled")
    .lte("starts_at", now)
    .not("meet_link", "is", null)
    .order("starts_at", { ascending: false })
    .limit(limit);

  let totalSynced = 0;
  for (const meeting of meetings ?? []) {
    try {
      const result = await syncMeetingAttendanceFromGoogle(meeting.id);
      totalSynced += result.synced;
    } catch {
      // Skip meetings that cannot sync yet.
    }
  }

  return { meetingsProcessed: meetings?.length ?? 0, totalSynced };
}
