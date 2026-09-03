import { createAdminClient } from "@kitsic/database";
import { getAvatarColorForUser } from "@/lib/avatar-color";
import { filterLeaderboardForViewer } from "@/lib/leaderboard-utils";
import { ACTIVE_HEAD_ROLE_SLUGS, userHasHeadRole } from "@/lib/leadership-roles";
import { getBoardCardStats, getTaskBoardFull } from "@/lib/board-data";

export async function getDashboardStats() {
  const supabase = createAdminClient();

  const [
    { count: memberCount },
    { count: taskCount },
    { count: completedTasks },
    { count: eventCount },
    { count: meetingCount },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("tasks").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("meetings").select("*", { count: "exact", head: true }),
  ]);

  const { data: attendance } = await supabase.from("attendance_records").select("status");
  const totalAttendance = attendance?.length ?? 0;
  const presentCount = attendance?.filter((a) => a.status === "present").length ?? 0;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const taskTotal = taskCount ?? 0;
  const taskCompleted = completedTasks ?? 0;
  const taskCompletionRate = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

  return {
    memberCount: memberCount ?? 0,
    taskCount: taskTotal,
    taskCompletionRate,
    eventCount: eventCount ?? 0,
    meetingCount: meetingCount ?? 0,
    attendanceRate,
  };
}

export async function getOverviewData(userId: string) {
  const [
    stats,
    tasks,
    board,
    boardStats,
    events,
    announcements,
    meetings,
    projects,
    leaderboard,
    finance,
    notifications,
  ] = await Promise.all([
    getDashboardStats(),
    getTasks(),
    getTaskBoardFull(),
    getBoardCardStats(),
    getEvents(),
    getAnnouncements(),
    getMeetings(),
    getProjects(),
    getLeaderboardForViewer(userId),
    getFinanceSummary(),
    getNotifications(userId),
  ]);

  const boardCards = board?.lists.flatMap((list) =>
    list.cards.map((card) => ({ ...card, listName: list.name })),
  ) ?? [];

  const listPipeline = board?.lists.map((list) => ({
    status: list.name.toLowerCase().replace(/\s+/g, "_"),
    label: list.name,
    count: list.cards.length,
  })) ?? [];

  const myBoardCards = boardCards
    .filter((card) => card.members.some((m) => m.user_id === userId))
    .slice(0, 4);

  const now = new Date();

  const upcomingEvents = events
    .filter((event) => event.status === "upcoming" && new Date(event.starts_at) >= now)
    .slice(0, 4);

  const upcomingMeetings = meetings
    .filter((meeting) => new Date(meeting.starts_at) >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const activeProjects = projects
    .filter((project) => ["active", "in_progress", "planning"].includes(project.status))
    .slice(0, 4);

  const taskStatuses = ["todo", "in_progress", "under_review", "completed", "blocked"] as const;
  const tasksByStatus = listPipeline.length > 0
    ? listPipeline
    : taskStatuses.map((status) => ({
        status,
        label: status.replace(/_/g, " "),
        count: tasks.filter((task) => task.status === status).length,
      }));

  const myTasks = myBoardCards.length > 0
    ? myBoardCards.map((card) => ({
        id: card.id,
        title: card.title,
        status: card.listName.toLowerCase().replace(/\s+/g, "_"),
        due_date: card.due_date,
        assignee: card.members[0] ? { full_name: card.members[0].full_name } : null,
        priority: "medium",
      }))
    : tasks.filter((task) => task.assigned_to === userId).slice(0, 4);

  const recentFromBoard = boardCards.slice(0, 5).map((card) => ({
    id: card.id,
    title: card.title,
    status: card.listName.toLowerCase().replace(/\s+/g, "_"),
    priority: "medium",
    assignee: card.members[0] ? { full_name: card.members[0].full_name } : null,
  }));

  return {
    stats: {
      ...stats,
      upcomingEventCount: upcomingEvents.length,
      taskCompletionRate: boardStats.total > 0 ? boardStats.completionRate : stats.taskCompletionRate,
    },
    recentTasks: recentFromBoard.length > 0 ? recentFromBoard : tasks.slice(0, 5),
    myTasks,
    upcomingEvents,
    nextMeeting: upcomingMeetings[0] ?? null,
    upcomingMeetingCount: upcomingMeetings.length,
    announcements: announcements.slice(0, 5),
    pinnedAnnouncements: announcements.filter((a) => a.is_pinned).slice(0, 2),
    activeProjects,
    projectCount: projects.length,
    topContributors: leaderboard.slice(0, 5),
    finance,
    unreadNotifications: notifications.filter((n) => !n.is_read).length,
    tasksByStatus,
    totalTasks: boardStats.total > 0 ? boardStats.total : tasks.length,
  };
}

export async function getAnalyticsData() {
  const supabase = createAdminClient();

  const { data: tasks } = await supabase.from("tasks").select("status, priority, category, created_at").is("deleted_at", null);
  const { data: attendance } = await supabase.from("attendance_records").select("status, created_at");
  const { data: members } = await supabase.from("users").select("created_at");

  const tasksByStatus = ["todo", "in_progress", "under_review", "completed", "blocked"].map((status) => ({
    status: status.replace("_", " "),
    count: tasks?.filter((t) => t.status === status).length ?? 0,
  }));

  const tasksByPriority = ["high", "medium", "low"].map((priority) => ({
    priority,
    count: tasks?.filter((t) => t.priority === priority).length ?? 0,
  }));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: months[d.getMonth()], monthIndex: d.getMonth(), year: d.getFullYear() };
  });

  const memberGrowth = lastSixMonths.map(({ month, monthIndex, year }) => ({
    month,
    members:
      members?.filter((m) => {
        const created = new Date(m.created_at);
        return created.getFullYear() < year || (created.getFullYear() === year && created.getMonth() <= monthIndex);
      }).length ?? 0,
  }));

  const attendanceTrend = lastSixMonths.map(({ month, monthIndex, year }) => {
    const monthRecords =
      attendance?.filter((a) => {
        const created = new Date(a.created_at);
        return created.getMonth() === monthIndex && created.getFullYear() === year;
      }) ?? [];
    const present = monthRecords.filter((a) => a.status === "present").length;
    const total = monthRecords.length || 1;
    return { month, rate: Math.round((present / total) * 100) };
  });

  const departmentActivity = Object.entries(
    (tasks ?? []).reduce<Record<string, number>>((acc, t) => {
      const cat = t.category ?? "General";
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([department, count]) => ({ department, score: Math.min(100, count * 15) }));

  return { tasksByStatus, tasksByPriority, memberGrowth, attendanceTrend, departmentActivity };
}

function parseRoleRelation(
  role: { name: string; slug: string } | { name: string; slug: string }[] | null,
) {
  if (Array.isArray(role)) return role[0] ?? null;
  return role;
}

async function fetchMembersBase() {
  const supabase = createAdminClient();

  const [{ data: users }, { data: roleLinks }] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, full_name, avatar_url, avatar_color, created_at, roll_number, branch, phone, member_id, skills, department:department_id(name, slug)")
      .order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, roles(name, slug)"),
  ]);

  const rolesByUser = new Map<string, { names: string[]; slugs: string[] }>();

  for (const link of roleLinks ?? []) {
    const role = parseRoleRelation(link.roles as { name: string; slug: string } | { name: string; slug: string }[] | null);
    if (!role) continue;

    const entry = rolesByUser.get(link.user_id) ?? { names: [], slugs: [] };
    entry.names.push(role.name);
    entry.slugs.push(role.slug);
    rolesByUser.set(link.user_id, entry);
  }

  return (users ?? []).map((user) => {
    const department = parseRoleRelation(
      user.department as { name: string; slug: string } | { name: string; slug: string }[] | null,
    );
    const roleData = rolesByUser.get(user.id) ?? { names: [], slugs: [] };

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      department: department?.name ?? null,
      roles: roleData.names,
      roleSlugs: roleData.slugs,
      member_id: user.member_id as string | null,
      roll_number: user.roll_number as string | null,
      branch: user.branch as string | null,
      phone: user.phone as string | null,
      skills: (user.skills as string[] | null) ?? [],
      avatar_color: getAvatarColorForUser(user.id as string),
    };
  });
}

export async function getMembersPageData() {
  const [membersBase, roles] = await Promise.all([fetchMembersBase(), getRoles()]);

  const members = await Promise.all(
    membersBase.map(async (member) => {
      const performance = await getMemberPerformance(member.id);
      return { ...member, ...performance };
    }),
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const stats = {
    total: members.length,
    leadership: members.filter((member) =>
      member.roleSlugs.some((slug) => ACTIVE_HEAD_ROLE_SLUGS.includes(slug as (typeof ACTIVE_HEAD_ROLE_SLUGS)[number])),
    ).length,
    newThisMonth: members.filter((member) => new Date(member.created_at) >= monthStart).length,
    activeContributors: members.filter((member) => member.contributionScore > 0).length,
  };

  return { members, roles, stats };
}

export async function getLeadershipRoster() {
  const { members } = await getMembersPageData();
  return members
    .filter((member) => userHasHeadRole(member.roleSlugs))
    .map((member) => ({
      id: member.id,
      full_name: member.full_name,
      email: member.email,
      member_id: member.member_id,
      roles: member.roles,
      roleSlugs: member.roleSlugs,
      avatar_url: member.avatar_url,
      avatar_color: member.avatar_color,
    }));
}

export async function getMembers() {
  const members = await fetchMembersBase();
  return members.map(({ roleSlugs: _roleSlugs, department: _department, ...member }) => member);
}

export async function getTasks() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tasks")
    .select("*, assignee:assigned_to(full_name), assigner:assigned_by(full_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getEvents() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("events").select("*").order("starts_at", { ascending: true });
  return data ?? [];
}

export async function getMeetings() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("meetings").select("*").order("starts_at", { ascending: false });
  return data ?? [];
}

export async function getAttendanceRecords() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("attendance_records")
    .select("*, user:user_id(full_name, email), meeting:meeting_id(title), event:event_id(title)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getNotifications(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAnnouncements() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getProjects() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("projects")
    .select("*, lead:lead_id(full_name)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getBudgets() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("budgets").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getExpenses() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getSponsors() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sponsors").select("*").order("amount", { ascending: false });
  return data ?? [];
}

export async function getFinanceSummary() {
  const [budgets, expenses, sponsors] = await Promise.all([
    getBudgets(),
    getExpenses(),
    getSponsors(),
  ]);

  const totalBudget = budgets.reduce((s, b) => s + Number(b.total_amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent_amount), 0);
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const sponsorTotal = sponsors.reduce((s, sp) => s + Number(sp.amount ?? 0), 0);

  const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    pendingCount: pendingExpenses.length,
    sponsorTotal,
    expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount })),
    budgets,
    expenses,
    sponsors,
  };
}

export async function getInventory() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("inventory_items")
    .select("*, assignee:assigned_to(full_name)")
    .order("category", { ascending: true });
  return data ?? [];
}

export async function getCertificates(userId?: string) {
  const supabase = createAdminClient();
  let query = supabase.from("certificates").select("*, user:user_id(full_name), issuer:issued_by(full_name)").order("issued_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  return data ?? [];
}

export async function getRoles() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("roles").select("id, slug, name").order("name");
  return data ?? [];
}

export async function getAuditLogs() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*, user:user_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getSystemSettings() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("system_settings").select("*");
  return data ?? [];
}

export async function getApiKeys() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("api_keys").select("id, name, key_prefix, scopes, is_active, last_used_at, created_at").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMemberPerformance(userId: string) {
  const supabase = createAdminClient();

  const [
    { data: tasks },
    { data: attendance },
    { data: certs },
    { data: projectMembers },
    { data: learningSubs },
  ] = await Promise.all([
    supabase.from("tasks").select("status").eq("assigned_to", userId).is("deleted_at", null),
    supabase.from("attendance_records").select("status").eq("user_id", userId),
    supabase.from("certificates").select("id").eq("user_id", userId),
    supabase.from("project_members").select("project_id").eq("user_id", userId),
    supabase.from("learning_submissions").select("points_earned, score").eq("user_id", userId),
  ]);

  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter((t) => t.status === "completed").length ?? 0;
  const totalAttendance = attendance?.length ?? 0;
  const presentCount = attendance?.filter((a) => a.status === "present").length ?? 0;
  const learningPoints = learningSubs?.reduce((sum, s) => sum + (s.points_earned ?? 0), 0) ?? 0;
  const scoredSubs = learningSubs?.filter((s) => s.score != null) ?? [];
  const avgQuizScore = scoredSubs.length > 0
    ? Math.round(scoredSubs.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredSubs.length)
    : 0;
  const modulesCompleted = learningSubs?.length ?? 0;

  const baseScore = completedTasks * 10 + presentCount * 5 + (certs?.length ?? 0) * 8;

  return {
    tasksAssigned: totalTasks,
    tasksCompleted: completedTasks,
    taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    attendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
    certificatesEarned: certs?.length ?? 0,
    projectsJoined: projectMembers?.length ?? 0,
    learningPoints,
    modulesCompleted,
    avgQuizScore,
    contributionScore: baseScore + learningPoints,
  };
}

export async function getLeaderboard() {
  const members = await getMembers();
  const scores = await Promise.all(
    members.map(async (m) => {
      const perf = await getMemberPerformance(m.id);
      return {
        id: m.id,
        full_name: m.full_name,
        avatar_url: m.avatar_url,
        avatar_color: getAvatarColorForUser(m.id),
        member_id: (m as { member_id?: string | null }).member_id ?? null,
        roles: m.roles.filter((r): r is string => Boolean(r)),
        ...perf,
      };
    }),
  );
  return scores.sort((a, b) => b.contributionScore - a.contributionScore);
}

async function getViewerRoleSlugs(userId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data: roleLinks } = await supabase
    .from("user_roles")
    .select("roles(slug)")
    .eq("user_id", userId);

  return (roleLinks ?? [])
    .map((link) => {
      const role = link.roles as { slug: string } | { slug: string }[] | null;
      if (Array.isArray(role)) return role[0]?.slug;
      return role?.slug;
    })
    .filter((slug): slug is string => Boolean(slug));
}

/** Leaderboard scoped by viewer role — members see peers only, leadership sees everyone */
export async function getLeaderboardForViewer(userId: string) {
  const [entries, viewerRoles] = await Promise.all([
    getLeaderboard(),
    getViewerRoleSlugs(userId),
  ]);
  return filterLeaderboardForViewer(entries, viewerRoles);
}

export async function globalSearch(query: string) {
  const supabase = createAdminClient();
  const q = `%${query}%`;

  const [members, tasks, events, projects, announcements] = await Promise.all([
    supabase.from("users").select("id, full_name, email").or(`full_name.ilike.${q},email.ilike.${q}`).limit(5),
    supabase.from("tasks").select("id, title, status").ilike("title", q).limit(5),
    supabase.from("events").select("id, title, status").ilike("title", q).limit(5),
    supabase.from("projects").select("id, name, status").ilike("name", q).limit(5),
    supabase.from("announcements").select("id, title").ilike("title", q).limit(5),
  ]);

  return {
    members: members.data ?? [],
    tasks: tasks.data ?? [],
    events: events.data ?? [],
    projects: projects.data ?? [],
    announcements: announcements.data ?? [],
  };
}

export async function getPublicEvents() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("events").select("id, title, description, location, starts_at, ends_at, status").eq("is_public", true).order("starts_at", { ascending: true });
  return data ?? [];
}

export async function getPublicProjects() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("projects").select("id, name, description, status, progress, domain").eq("is_public", true).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getPublicTeam() {
  const supabase = createAdminClient();
  const { data: users } = await supabase.from("users").select("id, full_name, avatar_url").limit(20);
  if (!users) return [];

  return Promise.all(
    users.map(async (u) => {
      const { data: roles } = await supabase.from("user_roles").select("roles(name, slug)").eq("user_id", u.id);
      const role = roles?.[0]?.roles as { name: string; slug: string } | { name: string; slug: string }[] | null;
      const roleName = Array.isArray(role) ? role[0]?.name : role?.name;
      return { ...u, role: roleName };
    }),
  );
}

export async function getQrSessions() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("qr_sessions")
    .select("*, meeting:meeting_id(title), event:event_id(title)")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getReportData() {
  const [stats, members, tasks, events, finance, projects, attendance] = await Promise.all([
    getDashboardStats(),
    getMembers(),
    getTasks(),
    getEvents(),
    getFinanceSummary(),
    getProjects(),
    getAttendanceRecords(),
  ]);

  return { stats, members, tasks, events, finance, projects, attendance };
}
