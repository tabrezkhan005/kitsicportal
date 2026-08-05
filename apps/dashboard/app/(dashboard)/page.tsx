import { getSessionUser } from "@kitsic/auth";
import { getOverviewData } from "@/lib/data";
import { ClubOverview } from "@/features/overview/club-overview";

export default async function OverviewPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const data = await getOverviewData(user.id);

  return <ClubOverview user={user} data={data} />;
}
