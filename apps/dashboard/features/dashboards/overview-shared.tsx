import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export const PIPELINE_COLORS: Record<string, string> = {
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

export function getPipelineColor(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  return PIPELINE_COLORS[key] ?? PIPELINE_COLORS[status.toLowerCase()] ?? "pipeline-todo";
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatOverviewDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SectionHeader({
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
      <Link href={href} className="dashboard-section-link shrink-0 font-ui">
        {linkLabel}
      </Link>
    </div>
  );
}

export function OverviewPanel({
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

export function OverviewEmpty({
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
      <Link href={href} className="dashboard-section-link mt-2 inline-flex items-center gap-1 font-ui">
        {action}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export function StatCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="group block">
      <article className="dashboard-card dashboard-card-hover p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <div className="overview-stat-icon">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="dashboard-stat-value mt-3 text-3xl font-bold">{value}</p>
        <p className="mt-2 flex items-center gap-1 font-body text-xs text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          View details
          <ArrowRight className="h-3 w-3" />
        </p>
      </article>
    </Link>
  );
}

export function LeadershipStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
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

export function ModuleLinkCard({
  label,
  href,
  description,
}: {
  label: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-[var(--dashboard-border-subtle)] bg-background/80 p-4 transition-colors hover:border-accent/40"
    >
      <p className="font-ui text-sm font-semibold text-primary">{label}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
