import { requirePermission } from "@kitsic/auth";
import { getAuditLogs } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { PageHeader } from "@/components/page-header";
import { AuditLogTable } from "@/features/audit/audit-log-table";

export const metadata = { title: "Audit Logs" };

export default async function AuditPage() {
  try {
    await requirePermission("audit.read");
  } catch {
    return <ForbiddenPage />;
  }

  const logs = await getAuditLogs();

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="System activity and change history" />
      <AuditLogTable logs={logs} />
    </div>
  );
}
