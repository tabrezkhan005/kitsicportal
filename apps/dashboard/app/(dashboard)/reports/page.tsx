import { requirePermission } from "@kitsic/auth";
import { getDashboardStats } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { PageHeader } from "@/components/page-header";
import { ReportsPanel } from "@/features/reports/reports-panel";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  try {
    await requirePermission("reports.read");
  } catch {
    return <ForbiddenPage />;
  }

  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Export club data and executive summaries" />
      <ReportsPanel stats={stats} />
    </div>
  );
}
