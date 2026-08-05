import { requirePermission } from "@kitsic/auth";
import { getClubResources } from "@/lib/platform-data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { ResourcesPanel } from "@/features/resources/resources-panel";

export const metadata = { title: "Resources" };

export default async function ResourcesPage() {
  let user;
  try {
    user = await requirePermission("resources.read");
  } catch {
    return <ForbiddenPage />;
  }

  const resources = await getClubResources();

  return <ResourcesPanel resources={resources} canManage={user.permissions.includes("resources.manage")} />;
}
