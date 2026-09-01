import Link from "next/link";
import type { RoleDashboardConfig } from "@/lib/leadership-roles";
import { ArrowRight } from "lucide-react";

interface RoleDashboardPanelProps {
  config: RoleDashboardConfig;
  stats: {
    memberCount: number;
    taskCompletionRate: number;
    upcomingEventCount: number;
    attendanceRate: number;
    meetingCount?: number;
  };
}

function resolveStatValue(
  key: RoleDashboardConfig["kpis"][number]["statKey"],
  stats: RoleDashboardPanelProps["stats"],
): string {
  if (!key) return "—";
  switch (key) {
    case "memberCount": return String(stats.memberCount);
    case "taskCompletionRate": return `${stats.taskCompletionRate}%`;
    case "upcomingEventCount": return String(stats.upcomingEventCount);
    case "attendanceRate": return `${stats.attendanceRate}%`;
    case "meetingCount": return String(stats.meetingCount ?? 0);
    default: return "—";
  }
}

export function RoleDashboardPanel({ config, stats }: RoleDashboardPanelProps) {
  return (
    <section className="dashboard-card border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono-brand text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
            Your leadership dashboard
          </p>
          <h2 className="font-display text-xl font-bold text-primary">{config.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{config.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.focusAreas.map((area) => (
            <span
              key={area}
              className="rounded-full border border-primary/10 bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary/70"
            >
              {area}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {config.quickActions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className="group rounded-xl border border-[var(--dashboard-border-subtle)] bg-background/80 p-4 transition-colors hover:border-accent/40"
          >
            <p className="font-ui text-sm font-semibold text-primary">{action.label}</p>
            <p className="mt-1 text-xs text-muted">{action.description}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
              Open <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {config.kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="rounded-lg border border-[var(--dashboard-border-subtle)] px-4 py-3 hover:border-accent/30"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{kpi.label}</p>
            <p className="mt-1 text-lg font-bold text-primary">
              {kpi.statKey ? resolveStatValue(kpi.statKey, stats) : "View"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
