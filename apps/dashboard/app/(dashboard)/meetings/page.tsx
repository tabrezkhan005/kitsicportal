import { requirePermission } from "@kitsic/auth";
import { getMeetings } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { MeetingsList } from "@/features/meetings/meetings-list";

export const metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  let user;
  try {
    user = await requirePermission("meetings.read");
  } catch {
    return <ForbiddenPage />;
  }

  const meetings = await getMeetings();

  return (
    <MeetingsList
      meetings={meetings}
      canManage={user.permissions.includes("meetings.manage")}
    />
  );
}
