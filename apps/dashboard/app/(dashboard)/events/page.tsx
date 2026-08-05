import { requirePermission } from "@kitsic/auth";
import { getEvents } from "@/lib/data";
import { getEventProposals } from "@/lib/platform-data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { EventsGrid } from "@/features/events/events-grid";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  let user;
  try {
    user = await requirePermission("events.read");
  } catch {
    return <ForbiddenPage />;
  }

  const [events, proposals] = await Promise.all([getEvents(), getEventProposals()]);

  return (
    <EventsGrid
      events={events}
      proposals={proposals}
      canManage={user.permissions.includes("events.manage")}
      canPropose={user.permissions.includes("events.propose")}
      currentUserId={user.id}
    />
  );
}
