"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { BarChart3, ExternalLink, Plus, Video, XCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageCreateButton } from "@/components/page-create-button";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { cancelMeeting, createMeeting, joinMeeting } from "@/lib/actions";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  meet_link: string | null;
  status: string;
}

interface MeetingsListProps {
  meetings: Meeting[];
  canManage?: boolean;
  googleConnected?: boolean;
}

export function MeetingsList({ meetings, canManage = false, googleConnected = false }: MeetingsListProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel(meetingId: string) {
    startTransition(async () => {
      await cancelMeeting(meetingId);
      router.refresh();
    });
  }

  function handleJoin(meetingId: string) {
    startTransition(async () => {
      const result = await joinMeeting(meetingId);
      if (result.data?.meetLink) {
        window.open(result.data.meetLink, "_blank", "noopener,noreferrer");
      }
      router.refresh();
    });
  }

  const createFields = [
    { name: "title", label: "Title", required: true, placeholder: "Weekly leadership meet" },
    { name: "description", label: "Description", type: "textarea" as const, placeholder: "Agenda" },
    { name: "starts_at", label: "Starts at", type: "datetime-local" as const, required: true },
    { name: "ends_at", label: "Ends at (optional)", type: "datetime-local" as const },
    ...(googleConnected
      ? []
      : [{
          name: "meet_link",
          label: "Google Meet link (optional)",
          placeholder: "Connect Google in Settings for auto-generated links",
        }]),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings"
        description={
          googleConnected
            ? "Schedule meetings with real Google Meet links — all members are invited automatically."
            : "Connect Google Calendar in Settings to create real Meet links from the portal."
        }
        actions={
          canManage ? (
            <PageCreateButton label="Schedule meeting" onClick={() => setOpen(true)} />
          ) : undefined
        }
      />

      {!googleConnected && canManage && (
        <div className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-primary">
          Google Calendar is not connected.{" "}
          <Link href="/settings" className="font-semibold underline underline-offset-2">
            Connect in Settings
          </Link>{" "}
          to auto-create Meet links and sync attendance.
        </div>
      )}

      {scheduleMessage && (
        <div className="rounded-[var(--radius-md)] border border-teal-500/30 bg-teal-500/5 px-4 py-3 text-sm text-teal-800">
          {scheduleMessage}
        </div>
      )}

      {meetings.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No meetings scheduled"
          description="Schedule a club meeting with a Google Meet link for all leadership and members."
          action={
            canManage ? (
              <Button type="button" onClick={() => setOpen(true)} className="font-ui rounded-xl">
                <Plus className="h-4 w-4" />
                Schedule first meeting
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="dashboard-card border-primary/10">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="font-display text-primary">{meeting.title}</CardTitle>
                  {meeting.description && (
                    <CardDescription className="mt-1 font-body">{meeting.description}</CardDescription>
                  )}
                </div>
                <Badge variant={meeting.status === "scheduled" ? "accent" : "muted"} className="shrink-0 capitalize">
                  {meeting.status}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-primary/60 font-body">
                  <Video className="h-4 w-4 shrink-0 text-accent" />
                  {new Date(meeting.starts_at).toLocaleString("en-IN", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="font-ui rounded-lg">
                    <Link href={`/meetings/${meeting.id}`}>
                      <BarChart3 className="h-3.5 w-3.5" />
                      Attendance
                    </Link>
                  </Button>
                  {meeting.meet_link && meeting.status === "scheduled" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleJoin(meeting.id)}
                      className="font-ui rounded-lg"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Join Meet
                    </Button>
                  )}
                  {canManage && meeting.status === "scheduled" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleCancel(meeting.id)}
                      className="font-ui rounded-lg"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} title="Schedule meeting">
        <CreateForm
          action={createMeeting}
          onSuccess={(result) => {
            setOpen(false);
            setScheduleMessage(result?.message ?? "Meeting scheduled. Invite emails are being sent to all members.");
          }}
          submitLabel="Schedule meeting"
          fields={createFields}
        />
      </Modal>
    </div>
  );
}
