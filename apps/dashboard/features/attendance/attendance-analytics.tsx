import { AttendanceCharts } from "@/features/attendance/attendance-charts";

interface AnalyticsRecord {
  id: string;
  status: string;
  created_at: string;
  meeting: { title: string; starts_at?: string; meeting_mode?: string } | null;
  event: { title: string; starts_at?: string } | null;
}

interface AttendanceAnalyticsProps {
  analytics: {
    records: AnalyticsRecord[];
    stats: {
      total: number;
      present: number;
      rate: number;
      onlinePresent: number;
      offlinePresent: number;
    };
    presentVsAbsent: { name: string; value: number }[];
    modeSplit: { name: string; value: number }[];
    monthlyTrend: { month: string; rate: number; attended: number; total: number }[];
  };
  compact?: boolean;
}

export function AttendanceAnalytics({ analytics, compact = false }: AttendanceAnalyticsProps) {
  const { stats, records } = analytics;

  if (compact) {
    return (
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance rate" value={`${stats.rate}%`} />
        <StatCard label="Sessions attended" value={String(stats.present)} />
        <StatCard label="Online meetings" value={String(stats.onlinePresent)} />
        <StatCard label="Offline meetings" value={String(stats.offlinePresent)} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <AttendanceCharts
        stats={stats}
        presentVsAbsent={analytics.presentVsAbsent}
        modeSplit={analytics.modeSplit}
        monthlyTrend={analytics.monthlyTrend}
      />

      <div className="dashboard-card overflow-hidden">
        <div className="border-b border-[var(--dashboard-border-subtle)] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-primary">Your attendance history</h2>
        </div>
        {records.length === 0 ? (
          <p className="px-6 py-8 text-center font-body text-sm text-muted">
            No attendance records yet. Join meetings and check in when sessions are open.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--dashboard-border-subtle)]">
            {records.map((record) => {
              const meeting = record.meeting;
              const event = record.event;
              const title = meeting?.title ?? event?.title ?? "Session";
              const mode = meeting?.meeting_mode ? ` · ${meeting.meeting_mode}` : "";
              const isPresent = record.status === "present";
              return (
                <li key={record.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="font-ui text-sm font-semibold text-primary">{title}{mode}</p>
                    <p className="font-body text-xs text-muted">
                      {new Date(record.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span
                    className={`font-ui text-xs font-semibold capitalize ${
                      isPresent ? "text-primary" : "text-muted"
                    }`}
                  >
                    {record.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="dashboard-card p-5">
      <p className="font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="dashboard-stat-value mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}
