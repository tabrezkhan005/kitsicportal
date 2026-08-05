import { NextResponse } from "next/server";
import { getReportData } from "@/lib/data";
import { getSessionUser } from "@kitsic/auth";

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user?.permissions.includes("reports.export") && !user?.permissions.includes("reports.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "summary";
  const data = await getReportData();

  let csv = "";
  const filename = `kitsic-${type}.csv`;

  switch (type) {
    case "members":
      csv = toCsv([
        ["Name", "Email", "Roles", "Joined"],
        ...data.members.map((m) => [
          m.full_name ?? "",
          m.email,
          m.roles.join("; "),
          new Date(m.created_at).toISOString(),
        ]),
      ]);
      break;
    case "tasks":
      csv = toCsv([
        ["Title", "Status", "Priority", "Due date"],
        ...data.tasks.map((t) => [
          t.title,
          t.status,
          t.priority,
          t.due_date ? new Date(t.due_date).toISOString() : "",
        ]),
      ]);
      break;
    case "events":
      csv = toCsv([
        ["Title", "Status", "Location", "Starts at"],
        ...data.events.map((e) => [
          e.title,
          e.status,
          e.location ?? "",
          new Date(e.starts_at).toISOString(),
        ]),
      ]);
      break;
    case "attendance":
      csv = toCsv([
        ["Member", "Status", "Duration (min)", "Recorded at"],
        ...data.attendance.map((a) => {
          const member = a.user as { full_name: string | null; email: string } | null;
          return [
            member?.full_name ?? member?.email ?? "",
            a.status,
            String(a.duration_minutes),
            new Date(a.created_at).toISOString(),
          ];
        }),
      ]);
      break;
    case "finance":
      csv = toCsv([
        ["Type", "Name", "Amount", "Status/Year"],
        ...data.finance.budgets.map((b) => ["Budget", b.name, String(b.total_amount), b.fiscal_year]),
        ...data.finance.expenses.map((e) => ["Expense", e.title, String(e.amount), e.status]),
        ...data.finance.sponsors.map((s) => ["Sponsor", s.name, String(s.amount ?? 0), s.tier]),
      ]);
      break;
    default:
      csv = toCsv([
        ["Metric", "Value"],
        ["Members", String(data.stats.memberCount)],
        ["Tasks", String(data.stats.taskCount)],
        ["Task completion rate", `${data.stats.taskCompletionRate}%`],
        ["Events", String(data.stats.eventCount)],
        ["Meetings", String(data.stats.meetingCount)],
        ["Attendance rate", `${data.stats.attendanceRate}%`],
        ["Total budget", String(data.finance.totalBudget)],
        ["Total spent", String(data.finance.totalSpent)],
        ["Projects", String(data.projects.length)],
      ]);
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
