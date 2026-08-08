"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kitsic/ui";
import { ArrowLeft, RefreshCw, Users, Video } from "lucide-react";
import { syncMeetingAttendance } from "@/lib/actions";
import type { MeetingAttendanceSummary } from "@/lib/meeting-attendance";

interface MeetingAttendancePanelProps {
  summary: MeetingAttendanceSummary;
  canManage?: boolean;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function statusVariant(status: "present" | "partial" | "absent") {
  if (status === "present") return "accent" as const;
  if (status === "partial") return "muted" as const;
  return "muted" as const;
}

export function MeetingAttendancePanel({ summary, canManage = false }: MeetingAttendancePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { meeting, rows, stats, presentThresholdMinutes } = summary;

  function handleSync() {
    startTransition(async () => {
      await syncMeetingAttendance(meeting.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm" className="font-ui rounded-lg">
          <Link href="/meetings">
            <ArrowLeft className="h-4 w-4" />
            All meetings
          </Link>
        </Button>
        {canManage && (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleSync}
            className="font-ui rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Sync from Google Meet
          </Button>
        )}
      </div>

      <Card className="dashboard-card border-primary/10">
        <CardHeader>
          <CardTitle className="font-display text-primary">{meeting.title}</CardTitle>
          <CardDescription className="font-body">
            {new Date(meeting.starts_at).toLocaleString("en-IN", {
              dateStyle: "full",
              timeStyle: "short",
            })}
            {meeting.attendance_synced_at
              ? ` · Last synced ${formatDateTime(meeting.attendance_synced_at)}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Present" value={stats.present} sub={`of ${stats.expected}`} />
          <Stat label="Partial" value={stats.partial} sub={`< ${presentThresholdMinutes} min`} />
          <Stat label="Absent" value={stats.absent} sub="No check-in" />
          <Stat
            label="Leadership"
            value={stats.leadershipPresent}
            sub={`of ${stats.leadershipExpected} heads`}
          />
        </CardContent>
      </Card>

      <Card className="dashboard-card overflow-hidden border-primary/10">
        <CardHeader className="border-b border-[var(--dashboard-border-subtle)]">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-accent" />
            Attendance roster
          </CardTitle>
          <CardDescription>
            Gen 4 leadership and Gen 5 members — join times sync from portal check-in and Google Meet.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-ui text-xs uppercase text-muted">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Left</th>
                <th className="px-4 py-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-t border-[var(--dashboard-border-subtle)]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-primary">{row.fullName}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.roles.join(", ")}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(row.status)} className="capitalize">
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(row.joinedAt)}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(row.leftAt)}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.durationMinutes > 0 ? `${row.durationMinutes} min` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {meeting.meet_link && meeting.status === "scheduled" && (
        <Card className="dashboard-card border-primary/10">
          <CardContent className="flex items-center gap-3 py-4">
            <Video className="h-5 w-5 text-accent" />
            <a
              href={meeting.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              Open Google Meet
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--dashboard-border-subtle)] p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
