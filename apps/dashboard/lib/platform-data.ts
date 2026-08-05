import "server-only";
import { createAdminClient } from "@kitsic/database";

export async function getEventProposals() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("event_proposals")
    .select("*, proposer:proposed_by(full_name, email), attachments:event_proposal_attachments(*)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getLearningModules(userId: string) {
  const supabase = createAdminClient();
  const [{ data: modules }, { data: submissions }] = await Promise.all([
    supabase.from("learning_modules").select("*").order("created_at", { ascending: false }),
    supabase.from("learning_submissions").select("*").eq("user_id", userId),
  ]);

  const submissionMap = new Map((submissions ?? []).map((s) => [s.module_id, s]));

  return (modules ?? []).map((module) => ({
    ...module,
    submission: submissionMap.get(module.id) ?? null,
  }));
}

export async function getClubResources() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("club_resources")
    .select("*, author:created_by(full_name)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getLeadershipMessages(roleSlugs: string[], userId?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("leadership_messages")
    .select("*, sender:sender_id(full_name, email, member_id)")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("sender_id", userId);
  } else if (roleSlugs.length > 0) {
    query = query.in("recipient_role", roleSlugs);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getMemberAttendanceAnalytics(userId: string) {
  const supabase = createAdminClient();

  const [{ data: records }, { data: meetings }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("*, meeting:meeting_id(title, starts_at, meeting_mode), event:event_id(title, starts_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("meetings").select("id, title, starts_at, meeting_mode, status").order("starts_at", { ascending: false }),
  ]);

  const total = records?.length ?? 0;
  const present = records?.filter((r) => r.status === "present").length ?? 0;
  const onlinePresent = records?.filter((r) => {
    const meeting = r.meeting as { meeting_mode?: string } | null;
    return r.status === "present" && meeting?.meeting_mode === "online";
  }).length ?? 0;
  const offlinePresent = records?.filter((r) => {
    const meeting = r.meeting as { meeting_mode?: string } | null;
    return r.status === "present" && meeting?.meeting_mode === "offline";
  }).length ?? 0;
  const absent = total - present;

  const monthMap = new Map<string, { attended: number; total: number }>();
  for (const record of records ?? []) {
    const key = new Date(record.created_at).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    const entry = monthMap.get(key) ?? { attended: 0, total: 0 };
    entry.total += 1;
    if (record.status === "present") entry.attended += 1;
    monthMap.set(key, entry);
  }

  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      rate: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
      attended: data.attended,
      total: data.total,
    }))
    .slice(-6);

  return {
    records: records ?? [],
    meetings: meetings ?? [],
    stats: {
      total,
      present,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
      onlinePresent,
      offlinePresent,
    },
    presentVsAbsent: [
      { name: "Present", value: present },
      { name: "Absent", value: absent },
    ],
    modeSplit: [
      { name: "Online", value: onlinePresent },
      { name: "Offline", value: offlinePresent },
    ],
    monthlyTrend,
  };
}

export async function getMembersHubData(userId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const [{ data: events }, { data: meetings }, { data: learningModules }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, starts_at, location, status")
      .gte("starts_at", now)
      .eq("status", "upcoming")
      .order("starts_at", { ascending: true })
      .limit(6),
    supabase
      .from("meetings")
      .select("id, title, starts_at, meet_link, status, meeting_mode")
      .gte("starts_at", now)
      .in("status", ["scheduled", "upcoming"])
      .order("starts_at", { ascending: true })
      .limit(6),
    supabase
      .from("learning_modules")
      .select("id, title, type, due_date")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const { data: myProposals } = await supabase
    .from("event_proposals")
    .select("id, title, status, proposed_starts_at")
    .eq("proposed_by", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    events: events ?? [],
    meetings: meetings ?? [],
    learningModules: learningModules ?? [],
    myProposals: myProposals ?? [],
  };
}

