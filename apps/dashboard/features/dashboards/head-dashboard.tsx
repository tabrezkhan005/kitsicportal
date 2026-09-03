import Link from "next/link";
import { Calendar, Plus, QrCode, Target } from "lucide-react";
import type { SessionUser } from "@kitsic/types";
import { ROLE_DASHBOARD_SECTIONS } from "@/features/dashboards/dashboard-config";
import type { OverviewData } from "@/features/dashboards/dashboard-types";
import { DashboardShell } from "@/features/dashboards/dashboard-shell";
import { KpiStrip, OverviewSections } from "@/features/dashboards/overview-sections";
import { RoleDashboardPanel } from "@/features/overview/role-dashboard-panel";
import { getRoleDashboardConfig } from "@/lib/leadership-roles";

const ROLE_ACCENT: Record<string, string> = {
  vice_president: "border-t-4 border-t-primary",
  secretary: "border-t-4 border-t-accent",
  joint_secretary: "border-t-4 border-t-accent/70",
  student_lead: "border-t-4 border-t-secondary",
  finance_head: "border-t-4 border-t-emerald-600",
  treasurer: "border-t-4 border-t-emerald-600",
  resource_head: "border-t-4 border-t-sky-600",
  logistics_head: "border-t-4 border-t-orange-500",
  literature_head: "border-t-4 border-t-violet-600",
  entrepreneurship_head: "border-t-4 border-t-amber-600",
  technical_head: "border-t-4 border-t-blue-600",
  digital_media_head: "border-t-4 border-t-pink-600",
  social_media_head: "border-t-4 border-t-pink-600",
  hospitality_head: "border-t-4 border-t-rose-500",
};

const MEMBER_QUICK_ACTIONS = [
  { label: "Tasks", href: "/tasks", icon: Target },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Check in", href: "/attendance", icon: QrCode },
  { label: "New event", href: "/events", icon: Plus },
] as const;

interface HeadDashboardProps {
  user: SessionUser;
  data: OverviewData;
  roleSlug: string;
}

export function HeadDashboard({ user, data, roleSlug }: HeadDashboardProps) {
  const config = getRoleDashboardConfig(user.roles);
  const sections = ROLE_DASHBOARD_SECTIONS[roleSlug] ?? ROLE_DASHBOARD_SECTIONS.technical_head;
  const accent = ROLE_ACCENT[roleSlug] ?? "";

  if (!config) return null;

  return (
    <DashboardShell
      user={user}
      title={config.title.toLowerCase()}
      subtitle={config.tagline}
      unreadNotifications={data.unreadNotifications}
      accentClass={accent}
      quickActions={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {config.quickActions.slice(0, 4).map((action) => (
            <Link key={action.href + action.label} href={action.href} className="dashboard-action-btn font-ui">
              <span className="truncate">{action.label}</span>
            </Link>
          ))}
        </div>
      }
    >
      <RoleDashboardPanel
        config={config}
        stats={{
          memberCount: data.stats.memberCount,
          taskCompletionRate: data.stats.taskCompletionRate,
          upcomingEventCount: data.stats.upcomingEventCount,
          attendanceRate: data.stats.attendanceRate,
          meetingCount: data.stats.meetingCount,
          financeBalance: data.finance.remaining,
        }}
      />

      <KpiStrip data={data} />

      <OverviewSections data={data} sections={sections} layout="sidebar" />
    </DashboardShell>
  );
}

interface MemberDashboardProps {
  user: SessionUser;
  data: OverviewData;
}

export function MemberDashboard({ user, data }: MemberDashboardProps) {
  return (
    <DashboardShell
      user={user}
      title="welcome back"
      subtitle="Your club command center — tasks, events, meetings, and member activity in one place."
      unreadNotifications={data.unreadNotifications}
      quickActions={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {MEMBER_QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="dashboard-action-btn font-ui">
              <action.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{action.label}</span>
            </Link>
          ))}
        </div>
      }
    >
      <KpiStrip data={data} />

      <OverviewSections
        data={data}
        sections={["taskPipeline", "events", "projects", "meetings", "announcements", "contributors", "myTasks"]}
        layout="sidebar"
      />
    </DashboardShell>
  );
}
