import { getSessionUser } from "@kitsic/auth";
import { getLeadershipRoster, getOverviewData } from "@/lib/data";
import { DashboardRouter } from "@/features/dashboards/dashboard-router";
import { resolvePrimaryHeadRole } from "@/lib/leadership-roles";

export default async function OverviewPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const primaryRole = resolvePrimaryHeadRole(user.roles);
  const needsRoster = primaryRole === "president";

  const [data, leadershipRoster] = await Promise.all([
    getOverviewData(user.id),
    needsRoster ? getLeadershipRoster() : Promise.resolve([]),
  ]);

  return (
    <DashboardRouter
      user={user}
      data={data}
      leadershipRoster={leadershipRoster}
    />
  );
}
