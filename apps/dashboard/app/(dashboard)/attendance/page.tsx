import { requirePermission, getSessionUser } from "@kitsic/auth";
import { ForbiddenPage } from "@/components/forbidden-page";
import { PageHeader } from "@/components/page-header";
import { AttendanceTools } from "@/features/attendance/attendance-tools";
import { AttendanceAnalytics } from "@/features/attendance/attendance-analytics";
import { getAttendanceRecords, getEvents, getMeetings, getQrSessions } from "@/lib/data";
import { getMemberAttendanceAnalytics } from "@/lib/platform-data";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  let user;
  try {
    user = await requirePermission("attendance.read");
  } catch {
    return <ForbiddenPage />;
  }

  const canManage = user.permissions.includes("attendance.manage");
  const sessionUser = await getSessionUser();
  const analytics = sessionUser ? await getMemberAttendanceAnalytics(sessionUser.id) : null;

  if (!canManage) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Attendance"
          description="Your meeting attendance analytics — online and offline"
        />
        {analytics && <AttendanceAnalytics analytics={analytics} />}
      </div>
    );
  }

  const [records, qrSessions, meetings, events] = await Promise.all([
    getAttendanceRecords(),
    getQrSessions(),
    getMeetings(),
    getEvents(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Attendance" description="Manage sessions and view club attendance records" />
      {analytics && <AttendanceAnalytics analytics={analytics} compact />}
      <AttendanceTools
        sessions={qrSessions}
        meetings={meetings.map((m) => ({ id: m.id, title: m.title }))}
        events={events.map((e) => ({ id: e.id, title: e.title }))}
        canManage
      />
      <section className="dashboard-card overflow-hidden">
        <div className="border-b border-[var(--dashboard-border-subtle)] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-primary">All records</h2>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-ui text-xs uppercase text-muted">
                <th className="px-4 py-2">Member</th>
                <th className="px-4 py-2">Event / Meeting</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const member = record.user as { full_name: string | null; email: string } | null;
                const meeting = record.meeting as { title: string } | null;
                const event = record.event as { title: string } | null;
                return (
                  <tr key={record.id} className="border-t border-[var(--dashboard-border-subtle)]">
                    <td className="px-4 py-2 font-ui text-primary">{member?.full_name ?? member?.email}</td>
                    <td className="px-4 py-2 text-muted">{meeting?.title ?? event?.title ?? "—"}</td>
                    <td className="px-4 py-2 capitalize text-muted">{record.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
