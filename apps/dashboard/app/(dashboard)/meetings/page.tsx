import { requirePermission } from "@kitsic/auth";
import { getMeetings } from "@/lib/data";
import { getGoogleCalendarStatus } from "@/lib/google/client";
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

  const [meetings, googleStatus] = await Promise.all([getMeetings(), getGoogleCalendarStatus()]);

  return (
    <MeetingsList
      meetings={meetings}
      canManage={user.permissions.includes("meetings.manage")}
      googleConnected={googleStatus.connected}
    />
  );
}
