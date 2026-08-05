import { requirePermission } from "@kitsic/auth";
import { getAnalyticsData, getDashboardStats } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { PageHeader } from "@/components/page-header";
import { AnalyticsCharts } from "@/features/analytics/analytics-charts";
import { Users, CheckCircle2, Calendar, Activity } from "lucide-react";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  try {
    await requirePermission("analytics.read");
  } catch {
    return <ForbiddenPage />;
  }

  const [stats, analytics] = await Promise.all([
    getDashboardStats(),
    getAnalyticsData(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Executive insights and club performance metrics"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active members", value: stats.memberCount, icon: Users },
          { label: "Task completion", value: `${stats.taskCompletionRate}%`, icon: CheckCircle2 },
          { label: "Total events", value: stats.eventCount, icon: Calendar },
          { label: "Attendance rate", value: `${stats.attendanceRate}%`, icon: Activity },
        ].map((stat) => (
          <article key={stat.label} className="dashboard-card p-5">
            <div className="flex items-start justify-between">
              <p className="font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">
                {stat.label}
              </p>
              <stat.icon className="h-4 w-4 text-accent" />
            </div>
            <p className="dashboard-stat-value mt-3 text-3xl font-bold text-primary">
              {stat.value}
            </p>
          </article>
        ))}
      </div>

      <AnalyticsCharts data={analytics} />
    </div>
  );
}
