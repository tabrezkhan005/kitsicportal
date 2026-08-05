import { requirePermission } from "@kitsic/auth";
import { getMembersPageData } from "@/lib/data";
import { getMembersHubData } from "@/lib/platform-data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { MembersDashboard } from "@/features/members/members-dashboard";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  let user;
  try {
    user = await requirePermission("members.read");
  } catch {
    return <ForbiddenPage />;
  }

  const [{ members, roles, stats }, hub] = await Promise.all([
    getMembersPageData(),
    getMembersHubData(user.id),
  ]);

  return (
    <MembersDashboard
      members={members}
      roles={roles}
      stats={stats}
      hub={hub}
      canAssignRoles={user.permissions.includes("roles.assign")}
      canIssueCertificates={user.permissions.includes("certificates.manage")}
    />
  );
}
