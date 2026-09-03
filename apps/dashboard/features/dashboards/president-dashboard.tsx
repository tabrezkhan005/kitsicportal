import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Plus,
  QrCode,
  Settings,
  Shield,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import type { SessionUser } from "@kitsic/types";
import { PRESIDENT_MODULE_LINKS } from "@/features/dashboards/dashboard-config";
import type { LeadershipRosterMember, OverviewData } from "@/features/dashboards/dashboard-types";
import { DashboardShell } from "@/features/dashboards/dashboard-shell";
import { formatCurrency, LeadershipStat, ModuleLinkCard } from "@/features/dashboards/overview-shared";
import { KpiStrip, OverviewSections } from "@/features/dashboards/overview-sections";
import { RoleDashboardPanel } from "@/features/overview/role-dashboard-panel";
import { getRoleDashboardConfig } from "@/lib/leadership-roles";

interface PresidentDashboardProps {
  user: SessionUser;
  data: OverviewData;
  leadershipRoster: LeadershipRosterMember[];
}

const QUICK_ACTIONS = [
  { label: "Members", href: "/members", icon: Users },
  { label: "Meetings", href: "/meetings", icon: Calendar },
  { label: "Tasks", href: "/tasks", icon: Target },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function PresidentDashboard({ user, data, leadershipRoster }: PresidentDashboardProps) {
  const config = getRoleDashboardConfig(user.roles);

  return (
    <DashboardShell
      user={user}
      title="president command center"
      subtitle="Full club oversight — every module, every head, and all operations in one place."
      badge="President"
      unreadNotifications={data.unreadNotifications}
      quickActions={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="dashboard-action-btn font-ui">
              <action.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{action.label}</span>
            </Link>
          ))}
        </div>
      }
    >
      {config && (
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
      )}

      <KpiStrip data={data} />

      <section className="dashboard-card p-6">
        <div className="mb-5">
          <p className="font-mono-brand text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
            All features
          </p>
          <h2 className="font-display mt-1 text-xl font-bold text-primary">Club modules</h2>
          <p className="mt-1 font-body text-sm text-muted">
            Quick access to every portal section — you have full permissions as President.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PRESIDENT_MODULE_LINKS.map((module) => (
            <ModuleLinkCard key={module.href} {...module} />
          ))}
        </div>
      </section>

      <OverviewSections
        data={data}
        sections={["taskPipeline", "events", "projects", "meetings", "announcements", "finance", "contributors"]}
        layout="sidebar"
      />

      <section className="dashboard-card overflow-hidden p-6">
        <div className="flex flex-col gap-4 border-b border-primary/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono-brand text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
              Leadership
            </p>
            <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-primary">Gen 4 head roster</h2>
            <p className="mt-1 font-body text-sm text-muted">
              {leadershipRoster.length} leadership account{leadershipRoster.length !== 1 ? "s" : ""} registered
            </p>
          </div>
          <Link
            href="/members"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-ui text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary"
          >
            Manage members
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {leadershipRoster.length === 0 ? (
          <p className="mt-5 font-body text-sm text-muted">No leadership accounts yet. Share invite codes from Settings.</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {leadershipRoster.map((head) => (
              <Link
                key={head.id}
                href="/members"
                className="flex items-center gap-3 rounded-xl border border-[var(--dashboard-border-subtle)] px-4 py-3 transition-colors hover:border-accent/40"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-ui text-xs font-bold text-white"
                  style={{ backgroundColor: head.avatar_color ?? "#033565" }}
                >
                  <Shield className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-ui text-sm font-semibold text-primary">
                    {head.full_name ?? head.email}
                  </p>
                  <p className="truncate font-body text-xs capitalize text-muted">
                    {head.roles.join(", ").toLowerCase()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-card overflow-hidden p-6">
        <div className="flex flex-col gap-4 border-b border-primary/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-primary">Executive summary</h2>
            <p className="mt-1 font-body text-sm text-muted">Club health at a glance</p>
          </div>
          <Link
            href="/reports"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-ui text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary"
          >
            Export reports
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LeadershipStat icon={Users} label="Members" value={String(data.stats.memberCount)} />
          <LeadershipStat icon={CheckCircle2} label="Task completion" value={`${data.stats.taskCompletionRate}%`} />
          <LeadershipStat icon={Activity} label="Attendance" value={`${data.stats.attendanceRate}%`} />
          <LeadershipStat icon={Wallet} label="Budget left" value={formatCurrency(data.finance.remaining)} />
        </div>
      </section>
    </DashboardShell>
  );
}
