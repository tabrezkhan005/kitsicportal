import { getSessionUser } from "@kitsic/auth";
import { getNotifications } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { NotificationsList } from "@/features/notifications/notifications-list";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getSessionUser();
  const notifications = user ? await getNotifications(user.id) : [];
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description={`${unread} unread`} />
      <NotificationsList notifications={notifications} />
    </div>
  );
}
