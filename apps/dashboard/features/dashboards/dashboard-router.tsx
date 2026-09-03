import type { SessionUser } from "@kitsic/types";
import { HeadDashboard, MemberDashboard } from "@/features/dashboards/head-dashboard";
import { PresidentDashboard } from "@/features/dashboards/president-dashboard";
import type { LeadershipRosterMember, OverviewData } from "@/features/dashboards/dashboard-types";
import { resolvePrimaryHeadRole } from "@/lib/leadership-roles";

interface DashboardRouterProps {
  user: SessionUser;
  data: OverviewData;
  leadershipRoster?: LeadershipRosterMember[];
}

export function DashboardRouter({ user, data, leadershipRoster = [] }: DashboardRouterProps) {
  const primaryRole = resolvePrimaryHeadRole(user.roles);

  if (!primaryRole || primaryRole === "member") {
    return <MemberDashboard user={user} data={data} />;
  }

  if (primaryRole === "president") {
    return (
      <PresidentDashboard user={user} data={data} leadershipRoster={leadershipRoster} />
    );
  }

  return <HeadDashboard user={user} data={data} roleSlug={primaryRole} />;
}
