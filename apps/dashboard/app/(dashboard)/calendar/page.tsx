import { requirePermission } from "@kitsic/auth";
import { getEvents, getMeetings } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { PageHeader } from "@/components/page-header";
import { ClubCalendar, type CalendarItem } from "@/features/calendar/club-calendar";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  try {
    await requirePermission("calendar.read");
  } catch {
    return <ForbiddenPage />;
  }

  const [events, meetings] = await Promise.all([getEvents(), getMeetings()]);

  const items: CalendarItem[] = [
    ...events.map((e) => ({
      id: e.id,
      title: e.title,
      type: "event" as const,
      starts_at: e.starts_at,
      ends_at: e.ends_at ?? null,
      location: e.location ?? null,
      status: e.status,
    })),
    ...meetings.map((m) => ({
      id: m.id,
      title: m.title,
      type: "meeting" as const,
      starts_at: m.starts_at,
      ends_at: m.ends_at ?? null,
      location: null,
      status: m.status,
    })),
  ].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description={`${items.length} scheduled ${items.length === 1 ? "item" : "items"} — events and meetings`}
      />

      <ClubCalendar items={items} />
    </div>
  );
}
