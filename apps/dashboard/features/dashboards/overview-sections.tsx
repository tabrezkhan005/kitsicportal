import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Megaphone,
  Package,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import type { DashboardSectionId, OverviewData } from "@/features/dashboards/dashboard-types";
import {
  formatCurrency,
  formatOverviewDate,
  getPipelineColor,
  OverviewEmpty,
  OverviewPanel,
  SectionHeader,
} from "@/features/dashboards/overview-shared";

interface OverviewSectionsProps {
  data: OverviewData;
  sections: DashboardSectionId[];
  layout?: "default" | "sidebar";
}

export function OverviewSections({ data, sections, layout = "default" }: OverviewSectionsProps) {
  const mainSections = sections.filter((id) =>
    ["taskPipeline", "events", "projects", "finance", "inventory"].includes(id),
  );
  const sideSections = sections.filter((id) =>
    ["meetings", "announcements", "contributors", "myTasks"].includes(id),
  );

  const mainContent = (
    <div className="space-y-5">
      {mainSections.map((section) => (
        <SectionBlock key={section} section={section} data={data} />
      ))}
    </div>
  );

  const sideContent = (
    <div className="space-y-5">
      {sideSections.map((section) => (
        <SectionBlock key={section} section={section} data={data} />
      ))}
    </div>
  );

  if (layout === "sidebar" && sideSections.length > 0) {
    return (
      <section className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">{mainContent}</div>
        <div className="space-y-5 xl:col-span-4">{sideContent}</div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <SectionBlock key={section} section={section} data={data} />
      ))}
    </div>
  );
}

function SectionBlock({ section, data }: { section: DashboardSectionId; data: OverviewData }) {
  switch (section) {
    case "taskPipeline":
      return <TaskPipelineSection data={data} />;
    case "events":
      return <EventsSection data={data} />;
    case "projects":
      return <ProjectsSection data={data} />;
    case "meetings":
      return <MeetingsSection data={data} />;
    case "announcements":
      return <AnnouncementsSection data={data} />;
    case "contributors":
      return <ContributorsSection data={data} />;
    case "myTasks":
      return <MyTasksSection data={data} />;
    case "finance":
      return <FinanceSection data={data} />;
    case "inventory":
      return <InventorySection />;
    default:
      return null;
  }
}

function TaskPipelineSection({ data }: { data: OverviewData }) {
  return (
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
  );
}

function EventsSection({ data }: { data: OverviewData }) {
  return (
    <OverviewPanel title="Upcoming events" description="Workshops & activities" href="/events">
      {data.upcomingEvents.length === 0 ? (
        <OverviewEmpty message="No upcoming events." href="/events" action="View events" />
      ) : (
        data.upcomingEvents.map((event) => (
          <Link key={event.id} href="/events" className="overview-link-row block rounded-xl px-4 py-3 overview-surface">
            <p className="font-ui text-sm font-semibold text-primary">{event.title}</p>
            <p className="mt-0.5 font-body text-xs text-muted">
              {formatOverviewDate(event.starts_at)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </Link>
        ))
      )}
    </OverviewPanel>
  );
}

function ProjectsSection({ data }: { data: OverviewData }) {
  return (
    <OverviewPanel title="Active projects" description={`${data.projectCount} in the club`} href="/projects">
      {data.activeProjects.length === 0 ? (
        <OverviewEmpty message="No active projects." href="/projects" action="View projects" />
      ) : (
        data.activeProjects.map((project) => (
          <Link key={project.id} href="/projects" className="overview-link-row block rounded-xl px-4 py-3 overview-surface">
            <div className="flex items-center justify-between gap-2">
              <p className="font-ui text-sm font-semibold text-primary">{project.name}</p>
              <span className="font-mono-brand text-xs font-medium text-muted">{project.progress ?? 0}%</span>
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
  );
}

function MeetingsSection({ data }: { data: OverviewData }) {
  return (
    <OverviewPanel
      title="Next meeting"
      description={data.upcomingMeetingCount > 0 ? `${data.upcomingMeetingCount} scheduled` : "Nothing on the calendar"}
      href="/meetings"
    >
      {data.nextMeeting ? (
        <div className="rounded-xl px-4 py-4 overview-surface">
          <p className="font-ui text-sm font-semibold text-primary">{data.nextMeeting.title}</p>
          <p className="mt-1 font-body text-xs text-muted">
            {formatOverviewDate(data.nextMeeting.starts_at)}
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
            <Link href="/meetings" className="dashboard-section-link inline-flex items-center gap-1 font-ui">
              All meetings
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : (
        <OverviewEmpty message="No meetings scheduled." href="/meetings" action="Schedule meeting" />
      )}
    </OverviewPanel>
  );
}

function AnnouncementsSection({ data }: { data: OverviewData }) {
  return (
    <OverviewPanel title="Announcements" description="From leadership" href="/announcements">
      {data.announcements.length === 0 ? (
        <OverviewEmpty message="No announcements yet." href="/announcements" action="View all" />
      ) : (
        data.announcements.map((announcement) => (
          <Link key={announcement.id} href="/announcements" className="overview-link-row block rounded-xl px-4 py-3 overview-surface">
            <div className="flex items-start gap-2">
              {announcement.is_pinned && <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />}
              <div className="min-w-0">
                <p className="font-ui text-sm font-semibold text-primary">{announcement.title}</p>
                <p className="mt-0.5 line-clamp-2 font-body text-xs text-muted">{announcement.content}</p>
              </div>
            </div>
          </Link>
        ))
      )}
    </OverviewPanel>
  );
}

function ContributorsSection({ data }: { data: OverviewData }) {
  return (
    <OverviewPanel title="Top contributors" description="Leaderboard" href="/learning#leaderboard">
      {data.topContributors.length === 0 ? (
        <p className="rounded-xl px-4 py-5 text-center font-body text-sm text-muted overview-surface">
          No member activity yet.
        </p>
      ) : (
        <div className="space-y-2">
          {data.topContributors.map((member, index) => (
            <div key={member.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 overview-surface">
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-ui text-xs font-bold",
                  index === 0 ? "bg-accent text-white" : "bg-primary/10 text-primary",
                ].join(" ")}
              >
                {index === 0 ? <Trophy className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name ?? "Member"}
                  className="h-8 w-8 shrink-0 rounded-full border border-[var(--dashboard-border)] object-cover"
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
                <p className="truncate font-ui text-sm font-semibold text-primary">{member.full_name ?? "Member"}</p>
                <p className="font-body text-xs text-muted">
                  {(member as { member_id?: string }).member_id
                    ? `${(member as { member_id?: string }).member_id} · `
                    : ""}
                  {member.contributionScore} pts
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </OverviewPanel>
  );
}

function MyTasksSection({ data }: { data: OverviewData }) {
  if (data.myTasks.length === 0) return null;
  return (
    <article className="dashboard-card border-primary/12 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted" />
        <h2 className="font-display text-lg font-bold tracking-tight text-primary">Your assignments</h2>
      </div>
      <div className="space-y-2">
        {data.myTasks.map((task) => (
          <Link key={task.id} href="/tasks" className="overview-link-row block rounded-xl px-4 py-3 overview-surface">
            <p className="font-ui text-sm font-semibold text-primary">{task.title}</p>
            <p className="font-body text-xs capitalize text-muted">
              {task.status.replace(/_/g, " ")}
              {" · due "}
              {task.due_date ? formatOverviewDate(task.due_date) : "none"}
            </p>
          </Link>
        ))}
      </div>
    </article>
  );
}

function FinanceSection({ data }: { data: OverviewData }) {
  return (
    <article className="dashboard-card p-6">
      <SectionHeader title="Finance snapshot" description="Budget & pending expenses" href="/finance" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl px-4 py-3.5 overview-surface">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted" />
            <p className="font-ui text-[10px] font-semibold uppercase tracking-wide text-muted">Budget left</p>
          </div>
          <p className="dashboard-stat-value mt-2 text-xl font-bold text-primary">
            {formatCurrency(data.finance.remaining)}
          </p>
        </div>
        <div className="rounded-xl px-4 py-3.5 overview-surface">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted" />
            <p className="font-ui text-[10px] font-semibold uppercase tracking-wide text-muted">Spent</p>
          </div>
          <p className="dashboard-stat-value mt-2 text-xl font-bold text-primary">
            {formatCurrency(data.finance.totalSpent)}
          </p>
        </div>
        <div className="rounded-xl px-4 py-3.5 overview-surface">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted" />
            <p className="font-ui text-[10px] font-semibold uppercase tracking-wide text-muted">Pending</p>
          </div>
          <p className="dashboard-stat-value mt-2 text-xl font-bold text-primary">{data.finance.pendingCount}</p>
        </div>
      </div>
      <Link href="/finance" className="dashboard-section-link mt-4 inline-flex items-center gap-1 font-ui text-sm">
        Open finance
        <ArrowRight className="h-3 w-3" />
      </Link>
    </article>
  );
}

function InventorySection() {
  return (
    <OverviewPanel title="Inventory" description="Stock & event supplies" href="/inventory">
      <OverviewEmpty message="Check stock levels and supplies." href="/inventory" action="Open inventory" />
    </OverviewPanel>
  );
}

export function KpiStrip({ data }: { data: OverviewData }) {
  const stats = [
    { label: "Members", value: String(data.stats.memberCount), href: "/members", icon: Users },
    { label: "Tasks complete", value: `${data.stats.taskCompletionRate}%`, href: "/tasks", icon: CheckCircle2 },
    { label: "Upcoming events", value: String(data.stats.upcomingEventCount), href: "/events", icon: Calendar },
    { label: "Attendance", value: `${data.stats.attendanceRate}%`, href: "/attendance", icon: Activity },
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.href} className="group block">
          <article className="dashboard-card dashboard-card-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">{stat.label}</p>
              <div className="overview-stat-icon">
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="dashboard-stat-value mt-3 text-3xl font-bold">{stat.value}</p>
          </article>
        </Link>
      ))}
    </section>
  );
}

export function InventoryQuickCard() {
  return (
    <Link href="/inventory" className="group block">
      <article className="dashboard-card dashboard-card-hover p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">Inventory</p>
          <Package className="h-4 w-4 text-muted" />
        </div>
        <p className="mt-3 font-body text-sm text-muted">Manage stock & supplies</p>
      </article>
    </Link>
  );
}
