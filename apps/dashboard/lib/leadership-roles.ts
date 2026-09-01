/**
 * Central leadership role definitions, permissions, and per-role dashboard config.
 */

export const HEAD_ROLE_SLUGS = [
  "president",
  "vice_president",
  "secretary",
  "joint_secretary",
  "student_lead",
  "finance_head",
  "resource_head",
  "logistics_head",
  "literature_head",
  "entrepreneurship_head",
  "technical_head",
  "digital_media_head",
  "social_media_head", // legacy alias
  "hospitality_head",
  "treasurer", // legacy alias → finance
] as const;

export type HeadRoleSlug = (typeof HEAD_ROLE_SLUGS)[number];

export const LEADERSHIP_SIGNUP_ROLES = [
  { slug: "president", label: "President", hierarchy: 100 },
  { slug: "vice_president", label: "Vice President", hierarchy: 90 },
  { slug: "secretary", label: "Secretary", hierarchy: 80 },
  { slug: "joint_secretary", label: "Joint Secretary", hierarchy: 75 },
  { slug: "student_lead", label: "Student Lead", hierarchy: 60 },
  { slug: "finance_head", label: "Finance Head", hierarchy: 80 },
  { slug: "resource_head", label: "Resource Head", hierarchy: 70 },
  { slug: "logistics_head", label: "Logistics Head", hierarchy: 70 },
  { slug: "literature_head", label: "Literature Head", hierarchy: 70 },
  { slug: "entrepreneurship_head", label: "Entrepreneurship Head", hierarchy: 70 },
  { slug: "technical_head", label: "Technical Head", hierarchy: 70 },
  { slug: "digital_media_head", label: "Digital Media Head", hierarchy: 70 },
  { slug: "hospitality_head", label: "Hospitality Head", hierarchy: 70 },
] as const;

export interface RoleDashboardConfig {
  slug: string;
  title: string;
  tagline: string;
  focusAreas: string[];
  quickActions: Array<{ label: string; href: string; description: string }>;
  kpis: Array<{ label: string; href: string; statKey?: keyof RoleStatKeys }>;
}

export interface RoleStatKeys {
  memberCount: boolean;
  taskCompletionRate: boolean;
  upcomingEventCount: boolean;
  attendanceRate: boolean;
  meetingCount: boolean;
  financeBalance: boolean;
}

const BASE_PROFILE = ["profile.read", "profile.update", "notifications.read", "calendar.read", "overview.read"] as const;

/** Permission sets reused across head roles */
export const ROLE_PERMISSION_MAP: Record<string, readonly string[]> = {
  president: ["*"],
  vice_president: [
    ...BASE_PROFILE,
    "analytics.read", "members.read", "members.update", "roles.read", "roles.assign",
    "tasks.read", "tasks.create", "tasks.assign", "tasks.approve",
    "events.read", "events.manage", "meetings.read", "meetings.manage",
    "attendance.read", "attendance.manage", "announcements.read", "announcements.manage",
    "reports.read", "reports.export", "projects.read", "projects.manage",
    "learning.read", "learning.manage", "resources.read", "resources.manage",
    "messages.read", "finance.read", "inventory.read", "settings.read",
    "whiteboard.read", "whiteboard.edit", "certificates.read", "certificates.manage",
    "audit.read",
  ],
  secretary: [
    ...BASE_PROFILE,
    "meetings.read", "meetings.manage", "attendance.read", "attendance.manage",
    "announcements.read", "announcements.manage", "reports.read", "reports.export",
    "certificates.read", "certificates.manage", "members.read",
    "resources.manage", "learning.manage", "messages.read", "events.manage",
  ],
  joint_secretary: [
    ...BASE_PROFILE,
    "meetings.read", "meetings.manage", "attendance.read", "attendance.manage",
    "announcements.read", "announcements.manage", "certificates.read", "certificates.manage",
    "members.read", "events.read", "events.manage", "messages.read",
  ],
  student_lead: [
    ...BASE_PROFILE,
    "members.read", "attendance.read", "attendance.manage",
    "tasks.read", "tasks.create", "tasks.assign",
    "whiteboard.read", "whiteboard.edit", "learning.read",
  ],
  finance_head: [
    ...BASE_PROFILE,
    "finance.read", "finance.manage", "sponsors.read", "sponsors.manage",
    "reports.read", "reports.export", "members.read",
  ],
  resource_head: [
    ...BASE_PROFILE,
    "members.read", "resources.read", "resources.manage",
    "learning.read", "learning.manage", "announcements.read",
  ],
  logistics_head: [
    ...BASE_PROFILE,
    "inventory.read", "inventory.manage", "events.read", "events.manage",
    "members.read",
  ],
  literature_head: [
    ...BASE_PROFILE,
    "announcements.read", "announcements.manage",
    "learning.read", "learning.manage", "resources.read", "resources.manage",
    "events.read",
  ],
  entrepreneurship_head: [
    ...BASE_PROFILE,
    "projects.read", "projects.manage", "events.read", "events.propose", "events.manage",
    "members.read", "announcements.read",
  ],
  technical_head: [
    ...BASE_PROFILE,
    "projects.read", "projects.manage", "tasks.read", "tasks.create",
    "tasks.assign", "tasks.approve", "whiteboard.read", "whiteboard.edit",
    "analytics.read", "members.read",
  ],
  digital_media_head: [
    ...BASE_PROFILE,
    "announcements.read", "announcements.manage", "events.read", "events.manage",
    "analytics.read", "resources.read",
  ],
  social_media_head: [
    ...BASE_PROFILE,
    "announcements.read", "announcements.manage", "events.read", "analytics.read",
  ],
  hospitality_head: [
    ...BASE_PROFILE,
    "events.read", "events.manage", "inventory.read", "inventory.manage",
    "members.read", "announcements.read",
  ],
  treasurer: [
    ...BASE_PROFILE,
    "finance.read", "finance.manage", "sponsors.read", "sponsors.manage",
    "reports.read", "reports.export",
  ],
};

export const ROLE_DASHBOARD_CONFIG: Record<string, RoleDashboardConfig> = {
  president: {
    slug: "president",
    title: "President command center",
    tagline: "Full club oversight — members, heads, finance, meetings, and approvals.",
    focusAreas: ["Club KPIs", "Head roster", "Approvals", "Audit & settings"],
    quickActions: [
      { label: "Members", href: "/members", description: "View all Gen 4 & Gen 5" },
      { label: "Meetings", href: "/meetings", description: "Schedule & attendance" },
      { label: "Reports", href: "/reports", description: "Export club data" },
      { label: "Settings", href: "/settings", description: "Integrations & API" },
    ],
    kpis: [
      { label: "Members", href: "/members", statKey: "memberCount" },
      { label: "Attendance", href: "/attendance", statKey: "attendanceRate" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
      { label: "Tasks done", href: "/tasks", statKey: "taskCompletionRate" },
    ],
  },
  vice_president: {
    slug: "vice_president",
    title: "Vice President hub",
    tagline: "Delegate operations, track heads, and keep events on schedule.",
    focusAreas: ["Operations", "Event pipeline", "Task oversight", "Member activity"],
    quickActions: [
      { label: "Events", href: "/events", description: "Manage club events" },
      { label: "Tasks", href: "/tasks", description: "Board & assignments" },
      { label: "Members", href: "/members", description: "Member directory" },
      { label: "Analytics", href: "/analytics", description: "Club metrics" },
    ],
    kpis: [
      { label: "Members", href: "/members", statKey: "memberCount" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
      { label: "Tasks done", href: "/tasks", statKey: "taskCompletionRate" },
      { label: "Attendance", href: "/attendance", statKey: "attendanceRate" },
    ],
  },
  secretary: {
    slug: "secretary",
    title: "Secretary workspace",
    tagline: "Meetings, attendance, certificates, and official club records.",
    focusAreas: ["Meetings & MOM", "Attendance", "Certificates", "Announcements"],
    quickActions: [
      { label: "Meetings", href: "/meetings", description: "Schedule Google Meets" },
      { label: "Attendance", href: "/attendance", description: "QR & sync" },
      { label: "Certificates", href: "/members", description: "Member records" },
      { label: "Announcements", href: "/announcements", description: "Club notices" },
    ],
    kpis: [
      { label: "Attendance", href: "/attendance", statKey: "attendanceRate" },
      { label: "Meetings", href: "/meetings", statKey: "meetingCount" },
      { label: "Members", href: "/members", statKey: "memberCount" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
    ],
  },
  joint_secretary: {
    slug: "joint_secretary",
    title: "Joint Secretary desk",
    tagline: "Support meetings, attendance tracking, and event coordination.",
    focusAreas: ["Meeting support", "Attendance", "Event logistics", "Announcements"],
    quickActions: [
      { label: "Meetings", href: "/meetings", description: "Join & schedule" },
      { label: "Attendance", href: "/attendance", description: "Check-in sessions" },
      { label: "Events", href: "/events", description: "Upcoming events" },
      { label: "Announcements", href: "/announcements", description: "Post updates" },
    ],
    kpis: [
      { label: "Attendance", href: "/attendance", statKey: "attendanceRate" },
      { label: "Meetings", href: "/meetings", statKey: "meetingCount" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
      { label: "Members", href: "/members", statKey: "memberCount" },
    ],
  },
  student_lead: {
    slug: "student_lead",
    title: "Student Lead dashboard",
    tagline: "Member engagement, batch attendance, and task coordination.",
    focusAreas: ["Member batches", "Attendance", "Tasks", "Learning"],
    quickActions: [
      { label: "Members", href: "/members", description: "Your batch" },
      { label: "Attendance", href: "/attendance", description: "Track presence" },
      { label: "Tasks", href: "/tasks", description: "Assign work" },
      { label: "Learning", href: "/learning", description: "Quizzes" },
    ],
    kpis: [
      { label: "Members", href: "/members", statKey: "memberCount" },
      { label: "Attendance", href: "/attendance", statKey: "attendanceRate" },
      { label: "Tasks done", href: "/tasks", statKey: "taskCompletionRate" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
    ],
  },
  finance_head: {
    slug: "finance_head",
    title: "Finance Head console",
    tagline: "Budgets, expenses, sponsors, and financial reports.",
    focusAreas: ["Budget", "Expenses", "Sponsors", "Reports"],
    quickActions: [
      { label: "Finance", href: "/finance", description: "Budget & expenses" },
      { label: "Reports", href: "/reports", description: "Export data" },
      { label: "Events", href: "/events", description: "Event costs" },
      { label: "Members", href: "/members", description: "Directory" },
    ],
    kpis: [
      { label: "Finance", href: "/finance", statKey: "financeBalance" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
      { label: "Members", href: "/members", statKey: "memberCount" },
      { label: "Reports", href: "/reports" },
    ],
  },
  resource_head: {
    slug: "resource_head",
    title: "Resource Head library",
    tagline: "Learning modules, roadmaps, internships, and member resources.",
    focusAreas: ["Resources", "Learning", "Skills", "Content curation"],
    quickActions: [
      { label: "Resources", href: "/resources", description: "Upload links" },
      { label: "Learning", href: "/learning", description: "Quizzes & modules" },
      { label: "Members", href: "/members", description: "Skills directory" },
      { label: "Announcements", href: "/announcements", description: "Share updates" },
    ],
    kpis: [
      { label: "Members", href: "/members", statKey: "memberCount" },
      { label: "Learning", href: "/learning" },
      { label: "Resources", href: "/resources" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
    ],
  },
  logistics_head: {
    slug: "logistics_head",
    title: "Logistics Head ops",
    tagline: "Inventory, venues, equipment, and event execution.",
    focusAreas: ["Inventory", "Events", "Venues", "Equipment"],
    quickActions: [
      { label: "Inventory", href: "/inventory", description: "Stock & assets" },
      { label: "Events", href: "/events", description: "Event setup" },
      { label: "Calendar", href: "/calendar", description: "Schedules" },
      { label: "Tasks", href: "/tasks", description: "Logistics tasks" },
    ],
    kpis: [
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
      { label: "Inventory", href: "/inventory" },
      { label: "Tasks done", href: "/tasks", statKey: "taskCompletionRate" },
      { label: "Members", href: "/members", statKey: "memberCount" },
    ],
  },
  literature_head: {
    slug: "literature_head",
    title: "Literature Head studio",
    tagline: "Content, publications, learning material, and club storytelling.",
    focusAreas: ["Content", "Learning", "Announcements", "Resources"],
    quickActions: [
      { label: "Learning", href: "/learning", description: "Create quizzes" },
      { label: "Resources", href: "/resources", description: "Reading material" },
      { label: "Announcements", href: "/announcements", description: "Publish" },
      { label: "Events", href: "/events", description: "Literary events" },
    ],
    kpis: [
      { label: "Learning", href: "/learning" },
      { label: "Resources", href: "/resources" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
      { label: "Members", href: "/members", statKey: "memberCount" },
    ],
  },
  entrepreneurship_head: {
    slug: "entrepreneurship_head",
    title: "Entrepreneurship Head launchpad",
    tagline: "Projects, startup events, partnerships, and pitch pipelines.",
    focusAreas: ["Projects", "Events", "Partnerships", "Pitch deck"],
    quickActions: [
      { label: "Projects", href: "/projects", description: "Startup projects" },
      { label: "Events", href: "/events", description: "Pitch nights" },
      { label: "Members", href: "/members", description: "Founders" },
      { label: "Tasks", href: "/tasks", description: "Action items" },
    ],
    kpis: [
      { label: "Projects", href: "/projects" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
      { label: "Tasks done", href: "/tasks", statKey: "taskCompletionRate" },
      { label: "Members", href: "/members", statKey: "memberCount" },
    ],
  },
  technical_head: {
    slug: "technical_head",
    title: "Technical Head lab",
    tagline: "Projects, task boards, whiteboard, and engineering delivery.",
    focusAreas: ["Projects", "Tasks", "Whiteboard", "Analytics"],
    quickActions: [
      { label: "Projects", href: "/projects", description: "Tech projects" },
      { label: "Tasks", href: "/tasks", description: "Sprint board" },
      { label: "Whiteboard", href: "/whiteboard", description: "Collaborate" },
      { label: "Analytics", href: "/analytics", description: "Metrics" },
    ],
    kpis: [
      { label: "Tasks done", href: "/tasks", statKey: "taskCompletionRate" },
      { label: "Projects", href: "/projects" },
      { label: "Members", href: "/members", statKey: "memberCount" },
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
    ],
  },
  digital_media_head: {
    slug: "digital_media_head",
    title: "Digital Media Head studio",
    tagline: "Social content, event promotion, announcements, and reach analytics.",
    focusAreas: ["Announcements", "Events promo", "Analytics", "Content calendar"],
    quickActions: [
      { label: "Announcements", href: "/announcements", description: "Post updates" },
      { label: "Events", href: "/events", description: "Promote events" },
      { label: "Analytics", href: "/analytics", description: "Reach stats" },
      { label: "Resources", href: "/resources", description: "Media assets" },
    ],
    kpis: [
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
      { label: "Members", href: "/members", statKey: "memberCount" },
      { label: "Analytics", href: "/analytics" },
      { label: "Announcements", href: "/announcements" },
    ],
  },
  hospitality_head: {
    slug: "hospitality_head",
    title: "Hospitality Head lounge",
    tagline: "Guest experience, event hospitality, refreshments, and inventory.",
    focusAreas: ["Events", "Guest care", "Inventory", "Coordination"],
    quickActions: [
      { label: "Events", href: "/events", description: "Guest lists" },
      { label: "Inventory", href: "/inventory", description: "Supplies" },
      { label: "Tasks", href: "/tasks", description: "Prep checklist" },
      { label: "Members", href: "/members", description: "Volunteers" },
    ],
    kpis: [
      { label: "Events", href: "/events", statKey: "upcomingEventCount" },
      { label: "Inventory", href: "/inventory" },
      { label: "Tasks done", href: "/tasks", statKey: "taskCompletionRate" },
      { label: "Members", href: "/members", statKey: "memberCount" },
    ],
  },
};

export function resolvePrimaryHeadRole(roleSlugs: string[]): string | null {
  const hierarchy = new Map(LEADERSHIP_SIGNUP_ROLES.map((r) => [r.slug, r.hierarchy]));
  let best: string | null = null;
  let bestLevel = -1;

  for (const slug of roleSlugs) {
    const normalized = slug === "social_media_head" ? "digital_media_head" : slug === "treasurer" ? "finance_head" : slug;
    if (!HEAD_ROLE_SLUGS.includes(normalized as HeadRoleSlug) && normalized !== "member") continue;
    const level = hierarchy.get(normalized as typeof LEADERSHIP_SIGNUP_ROLES[number]["slug"]) ?? 0;
    if (level > bestLevel) {
      bestLevel = level;
      best = normalized;
    }
  }

  return best;
}

export function getRoleDashboardConfig(roleSlugs: string[]): RoleDashboardConfig | null {
  const primary = resolvePrimaryHeadRole(roleSlugs);
  if (!primary) return null;
  return ROLE_DASHBOARD_CONFIG[primary] ?? ROLE_DASHBOARD_CONFIG.digital_media_head;
}

export function isHeadRole(slug: string): boolean {
  return HEAD_ROLE_SLUGS.includes(slug as HeadRoleSlug) && slug !== "member";
}

export const ACTIVE_HEAD_ROLE_SLUGS = LEADERSHIP_SIGNUP_ROLES.map((role) => role.slug);

export function userHasHeadRole(roleSlugs: string[]): boolean {
  return roleSlugs.some((slug) => isHeadRole(slug));
}
