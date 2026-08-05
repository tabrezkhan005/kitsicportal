"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { ExternalLink, Plus, Video, XCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageCreateButton } from "@/components/page-create-button";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { cancelMeeting, createMeeting } from "@/lib/actions";

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
}

export function MeetingsList({ meetings, canManage = false }: MeetingsListProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCancel(meetingId: string) {
    startTransition(async () => {
      await cancelMeeting(meetingId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings"
        description="Scheduled and past club meetings"
        actions={
          canManage ? (
            <PageCreateButton label="Schedule meeting" onClick={() => setOpen(true)} />
          ) : undefined
        }
      />

      {meetings.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No meetings scheduled"
          description="Schedule a club meeting with a Google Meet link for members to join."
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
                  {meeting.meet_link && meeting.status === "scheduled" && (
                    <a
                      href={meeting.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-secondary font-ui"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Join Meet
                    </a>
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
          onSuccess={() => setOpen(false)}
          submitLabel="Schedule meeting"
          fields={[
            { name: "title", label: "Title", required: true, placeholder: "Weekly standup" },
            { name: "description", label: "Description", type: "textarea", placeholder: "Agenda or notes" },
            { name: "starts_at", label: "Starts at", type: "datetime-local", required: true },
            { name: "ends_at", label: "Ends at (optional)", type: "datetime-local" },
            {
              name: "meet_link",
              label: "Google Meet link",
              placeholder: "https://meet.google.com/xxx-yyyy-zzz (auto-generated if empty)",
            },
          ]}
        />
      </Modal>
    </div>
  );
}
