import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Megaphone,
  Plus,
  QrCode,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@kitsic/ui";
import type { SessionUser } from "@kitsic/types";
import type { getOverviewData } from "@/lib/data";
import { getRoleDashboardConfig, userHasHeadRole } from "@/lib/leadership-roles";
import { RoleDashboardPanel } from "@/features/overview/role-dashboard-panel";

type OverviewData = Awaited<ReturnType<typeof getOverviewData>>;

interface ClubOverviewProps {
  user: SessionUser;
  data: OverviewData;
}

/** Pipeline segments — solid brand tones */
const PIPELINE_COLORS: Record<string, string> = {
  todo: "pipeline-todo",
  to_do: "pipeline-todo",
  "to do": "pipeline-todo",
  in_progress: "pipeline-progress",
  "in progress": "pipeline-progress",
  under_review: "pipeline-review",
  "under review": "pipeline-review",
  completed: "pipeline-done",
  done: "pipeline-done",
  blocked: "pipeline-blocked",
};

function getPipelineColor(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  return PIPELINE_COLORS[key] ?? PIPELINE_COLORS[status.toLowerCase()] ?? "pipeline-todo";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const QUICK_ACTIONS = [
  { label: "Tasks", href: "/tasks", icon: Target },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Check in", href: "/attendance", icon: QrCode },
  { label: "New event", href: "/events", icon: Plus },
] as const;

export function ClubOverview({ user, data }: ClubOverviewProps) {
  const isLeadership = userHasHeadRole(user.roles);

  const roleDashboard = getRoleDashboardConfig(user.roles);

  const firstName = user.fullName?.split(" ")[0] ?? "Member";

  const stats = [
    { label: "Members", value: data.stats.memberCount, href: "/members", icon: Users },
    { label: "Tasks complete", value: `${data.stats.taskCompletionRate}%`, href: "/tasks", icon: CheckCircle2 },
    { label: "Upcoming events", value: data.stats.upcomingEventCount, href: "/events", icon: Calendar },
    { label: "Attendance", value: `${data.stats.attendanceRate}%`, href: "/attendance", icon: Activity },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Welcome */}
      <section className="dashboard-welcome flex gap-4 rounded-xl px-6 py-6 sm:px-7">
        <div className="dashboard-welcome-accent hidden sm:block" aria-hidden />

        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="font-mono-brand text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
              Innovation Club · KITS Guntur · {getGreeting()}
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-primary sm:text-[1.75rem]">
              {firstName}, welcome back
            </h1>
            <p className="font-body text-sm leading-relaxed text-muted">
              Your club command center — tasks, events, meetings, and member activity in one place.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {user.roles.map((role) => (
                <Badge key={role} variant="default" className="capitalize font-ui text-[10px]">
                  {role.replace(/_/g, " ")}
                </Badge>
              ))}
              {data.unreadNotifications > 0 && (
                <Link href="/notifications">
                  <Badge className="border border-accent/40 bg-accent text-accent-foreground font-ui text-[10px]">
                    {data.unreadNotifications} notification{data.unreadNotifications > 1 ? "s" : ""}
                  </Badge>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="dashboard-action-btn font-ui">
                <action.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {roleDashboard && (
        <RoleDashboardPanel
          config={roleDashboard}
          stats={{
            memberCount: data.stats.memberCount,
            taskCompletionRate: data.stats.taskCompletionRate,
            upcomingEventCount: data.stats.upcomingEventCount,
            attendanceRate: data.stats.attendanceRate,
            meetingCount: data.stats.meetingCount,
          }}
        />
      )}

      {/* KPI strip */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group block">
            <article className="dashboard-card dashboard-card-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {stat.label}
                </p>
                <div className="overview-stat-icon">
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="dashboard-stat-value mt-3 text-3xl font-bold">
                {stat.value}
              </p>
              <p className="mt-2 flex items-center gap-1 font-body text-xs text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                View details
                <ArrowRight className="h-3 w-3" />
              </p>
            </article>
          </Link>
        ))}
      </section>

      {/* Main grid */}
      <section className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          {/* Task pipeline */}
          <article className="dashboard-card p-6">
            <SectionHeader
              title="Task pipeline"
              description={`${data.totalTasks} cards on the club board`}
              href="/tasks"
              linkLabel="Open board"
            />

            {data.totalTasks > 0 ? (
              <>
                <div className="mb-4 flex h-1.5 overflow-hidden rounded-full bg-[var(--dashboard-muted-surface)]">
                  {data.tasksByStatus.map((item) =>
                    item.count > 0 ? (
                      <div
                        key={item.status}
                        className={`overview-pipeline-segment ${getPipelineColor(item.status)}`}
                        style={{ width: `${(item.count / data.totalTasks) * 100}%` }}
                        title={`${item.label}: ${item.count}`}
                      />
                    ) : null,
                  )}
                </div>

                <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2">
                  {data.tasksByStatus.map((item) => (
                    <div key={item.status} className="flex items-center gap-1.5 font-body text-xs text-muted">
                      <span className={`h-2 w-2 rounded-full ${getPipelineColor(item.status)}`} />
                      <span className="capitalize">{item.label}</span>
                      <span className="font-semibold text-primary">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              {data.recentTasks.length === 0 ? (
                <OverviewEmpty message="No tasks on the board yet." href="/tasks" action="Open tasks" />
              ) : (
                data.recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/tasks"
                    className="overview-link-row flex items-center justify-between rounded-xl px-4 py-3 overview-surface"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-ui text-sm font-semibold text-primary">{task.title}</p>
                      <p className="font-body text-xs capitalize text-muted">
                        {(task.assignee as { full_name: string } | null)?.full_name ?? "Unassigned"}
                        {" · "}
                        {task.status.replace(/_/g, " ")}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted/60" />
                  </Link>
                ))
              )}
            </div>
          </article>

          <div className="grid gap-5 lg:grid-cols-2">
            <OverviewPanel title="Upcoming events" description="Workshops & activities" href="/events">
              {data.upcomingEvents.length === 0 ? (
                <OverviewEmpty message="No upcoming events." href="/events" action="View events" />
              ) : (
                data.upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href="/events"
                    className="overview-link-row block rounded-xl px-4 py-3 overview-surface"
                  >
                    <p className="font-ui text-sm font-semibold text-primary">{event.title}</p>
                    <p className="mt-0.5 font-body text-xs text-muted">
                      {formatDate(event.starts_at)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </Link>
                ))
              )}
            </OverviewPanel>

            <OverviewPanel
              title="Active projects"
              description={`${data.projectCount} in the club`}
              href="/projects"
            >
              {data.activeProjects.length === 0 ? (
                <OverviewEmpty message="No active projects." href="/projects" action="View projects" />
              ) : (
                data.activeProjects.map((project) => (
                  <Link
                    key={project.id}
                    href="/projects"
                    className="overview-link-row block rounded-xl px-4 py-3 overview-surface"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-ui text-sm font-semibold text-primary">{project.name}</p>
                      <span className="font-mono-brand text-xs font-medium text-muted">
                        {project.progress ?? 0}%
                      </span>
                    </div>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--dashboard-muted-surface)]">
                      <div
                        className="overview-pipeline-segment pipeline-review h-full rounded-full"
                        style={{ width: `${project.progress ?? 0}%` }}
                      />
                    </div>
                    <p className="mt-1.5 font-body text-xs capitalize text-muted">
                      {(project.lead as { full_name: string } | null)?.full_name ?? "No lead"}
                      {" · "}
                      {project.status.replace(/_/g, " ")}
                    </p>
                  </Link>
                ))
              )}
            </OverviewPanel>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-5 xl:col-span-4">
          <OverviewPanel title="Announcements" description="From leadership" href="/announcements">
            {data.announcements.length === 0 ? (
              <OverviewEmpty message="No announcements yet." href="/announcements" action="View all" />
            ) : (
              data.announcements.map((announcement) => (
                <Link
                  key={announcement.id}
                  href="/announcements"
                  className="overview-link-row block rounded-xl px-4 py-3 overview-surface"
                >
                  <div className="flex items-start gap-2">
                    {announcement.is_pinned && (
                      <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                    )}
                    <div className="min-w-0">
                      <p className="font-ui text-sm font-semibold text-primary">{announcement.title}</p>
                      <p className="mt-0.5 line-clamp-2 font-body text-xs text-muted">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </OverviewPanel>

          <OverviewPanel
            title="Next meeting"
            description={
              data.upcomingMeetingCount > 0
                ? `${data.upcomingMeetingCount} scheduled`
                : "Nothing on the calendar"
            }
            href="/meetings"
          >
            {data.nextMeeting ? (
              <div className="rounded-xl px-4 py-4 overview-surface">
                <p className="font-ui text-sm font-semibold text-primary">{data.nextMeeting.title}</p>
                <p className="mt-1 font-body text-xs text-muted">
                  {formatDate(data.nextMeeting.starts_at)}
                  {data.nextMeeting.meet_link ? " · Google Meet" : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.nextMeeting.meet_link && (
                    <a
                      href={data.nextMeeting.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-ui text-xs font-semibold text-primary-foreground transition-colors hover:bg-secondary"
                    >
                      Join Meet
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                  <Link
                    href="/meetings"
                    className="dashboard-section-link inline-flex items-center gap-1 font-ui"
                  >
                    All meetings
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <OverviewEmpty message="No meetings scheduled." href="/meetings" action="Schedule meeting" />
            )}
          </OverviewPanel>

          <OverviewPanel title="Top contributors" description="Leaderboard" href="/learning#leaderboard">
            {data.topContributors.length === 0 ? (
              <p className="rounded-xl px-4 py-5 text-center font-body text-sm text-muted overview-surface">
                No member activity yet.
              </p>
            ) : (
              <div className="space-y-2">
                {data.topContributors.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 overview-surface"
                  >
                    <span
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-ui text-xs font-bold",
                        index === 0
                          ? "bg-accent text-white"
                          : "bg-primary/10 text-primary",
                      ].join(" ")}
                    >
                      {index === 0 ? <Trophy className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name ?? "Member"}
                        className="h-8 w-8 shrink-0 rounded-full object-cover border border-[var(--dashboard-border)]"
                      />
                    ) : (
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-ui text-[10px] font-bold text-white"
                        style={{ backgroundColor: (member as { avatar_color?: string }).avatar_color ?? "#033565" }}
                      >
                        {(member.full_name ?? "M").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-ui text-sm font-semibold text-primary">
                        {member.full_name ?? "Member"}
                      </p>
                      <p className="font-body text-xs text-muted">
                        {(member as { member_id?: string }).member_id ? `${(member as { member_id?: string }).member_id} · ` : ""}
                        {member.contributionScore} pts
                        {(member as { learningPoints?: number }).learningPoints
                          ? ` · ${(member as { learningPoints?: number }).learningPoints} learning`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </OverviewPanel>

          {data.myTasks.length > 0 && (
            <article className="dashboard-card border-primary/12 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted" />
                <h2 className="font-display text-lg font-bold tracking-tight text-primary">
                  Your assignments
                </h2>
              </div>
              <div className="space-y-2">
                {data.myTasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/tasks"
                    className="overview-link-row block rounded-xl px-4 py-3 overview-surface"
                  >
                    <p className="font-ui text-sm font-semibold text-primary">{task.title}</p>
                    <p className="font-body text-xs capitalize text-muted">
                      {task.status.replace(/_/g, " ")}
                      {" · due "}
                      {task.due_date ? formatDate(task.due_date) : "none"}
                    </p>
                  </Link>
                ))}
              </div>
            </article>
          )}
        </div>
      </section>

      {isLeadership && (
        <section className="dashboard-card overflow-hidden p-6">
          <div className="flex flex-col gap-4 border-b border-primary/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono-brand text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
                Leadership
              </p>
              <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-primary">
                Executive summary
              </h2>
              <p className="mt-1 font-body text-sm text-muted">
                Members, tasks, attendance, and finance at a glance.
              </p>
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

          <p className="mt-4 font-body text-sm text-muted">
            {data.stats.memberCount} members · {data.stats.taskCompletionRate}% tasks done ·{" "}
            {data.stats.attendanceRate}% attendance · {data.stats.meetingCount} meetings ·{" "}
            {data.finance.pendingCount} pending expense{data.finance.pendingCount !== 1 ? "s" : ""}
          </p>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  description,
  href,
  linkLabel = "View all",
}: {
  title: string;
  description: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-primary">{title}</h2>
        <p className="mt-0.5 font-body text-sm text-muted">{description}</p>
      </div>
      <Link
        href={href}
        className="dashboard-section-link shrink-0 font-ui"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

function OverviewPanel({
  title,
  description,
  href,
  children,
}: {
  title: string;
  description: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <article className="dashboard-card p-6">
      <SectionHeader title={title} description={description} href={href} />
      <div className="space-y-2">{children}</div>
    </article>
  );
}

function OverviewEmpty({
  message,
  href,
  action,
}: {
  message: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-primary/12 px-4 py-6 text-center overview-surface">
      <p className="font-body text-sm text-muted">{message}</p>
      <Link
        href={href}
        className="dashboard-section-link mt-2 inline-flex items-center gap-1 font-ui"
      >
        {action}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function LeadershipStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl px-4 py-3.5 overview-surface">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted" />
        <p className="font-ui text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      </div>
      <p className="dashboard-stat-value mt-2 text-xl font-bold text-primary">{value}</p>
    </div>
  );
}
