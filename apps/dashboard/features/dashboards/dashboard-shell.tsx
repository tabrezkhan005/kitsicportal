import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@kitsic/ui";
import type { SessionUser } from "@kitsic/types";
import { getGreeting } from "@/features/dashboards/overview-shared";

interface DashboardShellProps {
  user: SessionUser;
  title: string;
  subtitle: string;
  badge?: string;
  unreadNotifications?: number;
  quickActions?: ReactNode;
  accentClass?: string;
  children: ReactNode;
}

export function DashboardShell({
  user,
  title,
  subtitle,
  badge,
  unreadNotifications = 0,
  quickActions,
  accentClass = "",
  children,
}: DashboardShellProps) {
  const firstName = user.fullName?.split(" ")[0] ?? "Member";

  return (
    <div className={`mx-auto max-w-7xl space-y-6 ${accentClass}`}>
      <section className="dashboard-welcome flex gap-4 rounded-xl px-6 py-6 sm:px-7">
        <div className="dashboard-welcome-accent hidden sm:block" aria-hidden />

        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="font-mono-brand text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
              Innovation Club · KITS Guntur · {getGreeting()}
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-primary sm:text-[1.75rem]">
              {firstName}, {title}
            </h1>
            <p className="font-body text-sm leading-relaxed text-muted">{subtitle}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {badge && (
                <Badge variant="default" className="font-ui text-[10px] capitalize">
                  {badge}
                </Badge>
              )}
              {user.roles.map((role) => (
                <Badge key={role} variant="default" className="capitalize font-ui text-[10px]">
                  {role.replace(/_/g, " ")}
                </Badge>
              ))}
              {unreadNotifications > 0 && (
                <Link href="/notifications">
                  <Badge className="border border-accent/40 bg-accent text-accent-foreground font-ui text-[10px]">
                    {unreadNotifications} notification{unreadNotifications > 1 ? "s" : ""}
                  </Badge>
                </Link>
              )}
            </div>
          </div>
          {quickActions}
        </div>
      </section>

      {children}
    </div>
  );
}
