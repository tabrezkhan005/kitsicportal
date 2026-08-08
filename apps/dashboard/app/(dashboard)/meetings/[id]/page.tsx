import { requirePermission } from "@kitsic/auth";
import { notFound } from "next/navigation";
import { ForbiddenPage } from "@/components/forbidden-page";
import { PageHeader } from "@/components/page-header";
import { MeetingAttendancePanel } from "@/features/meetings/meeting-attendance-panel";
import { getMeetingAttendanceSummary } from "@/lib/meeting-attendance";

export const metadata = { title: "Meeting attendance" };

interface MeetingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const { id } = await params;

  let user;
  try {
    user = await requirePermission("meetings.read");
  } catch {
    return <ForbiddenPage />;
  }

  const summary = await getMeetingAttendanceSummary(id);
  if (!summary) notFound();

  const canManage = user.permissions.includes("attendance.manage");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Meeting attendance"
        description="Track leadership and member presence with automatic Google Meet sync"
      />
      <MeetingAttendancePanel summary={summary} canManage={canManage} />
    </div>
  );
}
