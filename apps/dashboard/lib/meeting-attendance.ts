import "server-only";

import { createAdminClient } from "@kitsic/database";
import { computePresentThresholdMinutes } from "@/lib/google/config";

const HEAD_ROLE_SLUGS = [
  "president",
  "vice_president",
  "secretary",
  "treasurer",
  "technical_head",
  "social_media_head",
  "resource_head",
  "logistics_head",
  "student_lead",
] as const;

export interface MeetingAttendanceRow {
  userId: string;
  fullName: string;
  email: string;
  roles: string[];
  roleSlugs: string[];
  isLeadership: boolean;
  status: "present" | "partial" | "absent";
  joinedAt: string | null;
  leftAt: string | null;
  durationMinutes: number;
  source: string | null;
}

export interface MeetingAttendanceSummary {
  meeting: {
    id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    meet_link: string | null;
    status: string;
    google_meet_code: string | null;
    attendance_synced_at: string | null;
    mom_status: string | null;
    mom_file_url: string | null;
    mom_file_name: string | null;
    mom_uploaded_at: string | null;
  };
  momAssignee: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  rows: MeetingAttendanceRow[];
  stats: {
    expected: number;
    present: number;
    partial: number;
    absent: number;
    leadershipPresent: number;
    leadershipExpected: number;
    membersPresent: number;
    membersExpected: number;
  };
  presentThresholdMinutes: number;
}

function parseRoles(
  role: { name: string; slug: string } | { name: string; slug: string }[] | null,
) {
  if (Array.isArray(role)) return role[0] ?? null;
  return role;
}

export async function getMeetingById(meetingId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("meetings").select("*").eq("id", meetingId).maybeSingle();
  return data;
}

export async function getMeetingAttendanceSummary(meetingId: string): Promise<MeetingAttendanceSummary | null> {
  const supabase = createAdminClient();

  const [{ data: meeting }, { data: users }, { data: roleLinks }, { data: records }] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", meetingId).maybeSingle(),
    supabase.from("users").select("id, email, full_name").is("deleted_at", null).order("full_name"),
    supabase.from("user_roles").select("user_id, roles(name, slug)"),
    supabase
      .from("attendance_records")
      .select("user_id, status, joined_at, left_at, duration_minutes, source")
      .eq("meeting_id", meetingId),
  ]);

  if (!meeting) return null;

  const rolesByUser = new Map<string, { names: string[]; slugs: string[] }>();
  for (const link of roleLinks ?? []) {
    const role = parseRoles(link.roles as { name: string; slug: string } | { name: string; slug: string }[] | null);
    if (!role) continue;
    const entry = rolesByUser.get(link.user_id) ?? { names: [], slugs: [] };
    entry.names.push(role.name);
    entry.slugs.push(role.slug);
    rolesByUser.set(link.user_id, entry);
  }

  const recordByUser = new Map((records ?? []).map((record) => [record.user_id, record]));
  const threshold = computePresentThresholdMinutes(meeting.starts_at, meeting.ends_at);

  const rows: MeetingAttendanceRow[] = (users ?? []).map((user) => {
    const roleData = rolesByUser.get(user.id) ?? { names: ["Member"], slugs: ["member"] };
    const record = recordByUser.get(user.id);
    const isLeadership = roleData.slugs.some((slug) =>
      HEAD_ROLE_SLUGS.includes(slug as (typeof HEAD_ROLE_SLUGS)[number]),
    );

    return {
      userId: user.id,
      fullName: user.full_name ?? user.email,
      email: user.email,
      roles: roleData.names,
      roleSlugs: roleData.slugs,
      isLeadership,
      status: (record?.status as "present" | "partial" | undefined) ?? "absent",
      joinedAt: record?.joined_at ?? null,
      leftAt: record?.left_at ?? null,
      durationMinutes: record?.duration_minutes ?? 0,
      source: record?.source ?? null,
    };
  });

  rows.sort((a, b) => {
    if (a.isLeadership !== b.isLeadership) return a.isLeadership ? -1 : 1;
    return a.fullName.localeCompare(b.fullName);
  });

  const leadershipRows = rows.filter((row) => row.isLeadership);
  const memberRows = rows.filter((row) => !row.isLeadership);

  let momAssignee: MeetingAttendanceSummary["momAssignee"] = null;
  if (meeting.mom_assignee_id) {
    const { data: assignee } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("id", meeting.mom_assignee_id)
      .maybeSingle();
    if (assignee) {
      momAssignee = {
        id: assignee.id,
        fullName: assignee.full_name ?? assignee.email,
        email: assignee.email,
      };
    }
  }

  return {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      starts_at: meeting.starts_at,
      ends_at: meeting.ends_at,
      meet_link: meeting.meet_link,
      status: meeting.status,
      google_meet_code: meeting.google_meet_code,
      attendance_synced_at: meeting.attendance_synced_at,
      mom_status: meeting.mom_status ?? "pending",
      mom_file_url: meeting.mom_file_url ?? null,
      mom_file_name: meeting.mom_file_name ?? null,
      mom_uploaded_at: meeting.mom_uploaded_at ?? null,
    },
    momAssignee,
    rows,
    stats: {
      expected: rows.length,
      present: rows.filter((row) => row.status === "present").length,
      partial: rows.filter((row) => row.status === "partial").length,
      absent: rows.filter((row) => row.status === "absent").length,
      leadershipPresent: leadershipRows.filter((row) => row.status === "present").length,
      leadershipExpected: leadershipRows.length,
      membersPresent: memberRows.filter((row) => row.status === "present").length,
      membersExpected: memberRows.length,
    },
    presentThresholdMinutes: threshold,
  };
}
