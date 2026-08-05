import { requirePermission } from "@kitsic/auth";
import { getAnnouncements } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { AnnouncementsFeed } from "@/features/announcements/announcements-feed";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  let user;
  try {
    user = await requirePermission("announcements.read");
  } catch {
    return <ForbiddenPage />;
  }

  const announcements = await getAnnouncements();

  return (
    <AnnouncementsFeed
      announcements={announcements}
      canManage={user.permissions.includes("announcements.manage")}
    />
  );
}
