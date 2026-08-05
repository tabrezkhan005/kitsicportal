import { requirePermission } from "@kitsic/auth";
import { getFinanceSummary } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { FinanceDashboardInteractive } from "@/features/finance/finance-dashboard-interactive";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  let user;
  try {
    user = await requirePermission("finance.read");
  } catch {
    return <ForbiddenPage />;
  }

  const finance = await getFinanceSummary();

  return (
    <FinanceDashboardInteractive
      data={finance}
      canManage={user.permissions.includes("finance.manage")}
    />
  );
}
