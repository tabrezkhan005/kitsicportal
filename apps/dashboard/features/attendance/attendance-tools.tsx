"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@kitsic/ui";
import { QrCode, ScanLine } from "lucide-react";
import { checkInWithCode, createQrSession } from "@/lib/actions";
import { CreateForm } from "@/components/create-form";
import { Modal } from "@/components/modal";

interface QrSession {
  id: string;
  code: string;
  expires_at: string;
  meeting: { title: string } | { title: string }[] | null;
  event: { title: string } | { title: string }[] | null;
}

interface AttendanceToolsProps {
  sessions: QrSession[];
  meetings: Array<{ id: string; title: string }>;
  events: Array<{ id: string; title: string }>;
  canManage?: boolean;
}

function getTitle(session: QrSession) {
  const meeting = session.meeting;
  const event = session.event;
  if (meeting) return Array.isArray(meeting) ? meeting[0]?.title ?? "Meeting" : meeting.title;
  if (event) return Array.isArray(event) ? event[0]?.title ?? "Event" : event.title;
  return "Session";
}

export function AttendanceTools({ sessions, meetings, events, canManage = false }: AttendanceToolsProps) {
  const router = useRouter();
  const [checkInCode, setCheckInCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeSessions = sessions.filter((s) => new Date(s.expires_at) > new Date());

  function handleCheckIn() {
    startTransition(async () => {
      const result = await checkInWithCode(checkInCode);
      setMessage(result.error ?? "Checked in successfully!");
      if (result.success) {
        setCheckInCode("");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-5 w-5 text-accent" />
            Check in
          </CardTitle>
          <CardDescription>Enter the QR code shown at the meeting or event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={checkInCode}
              onChange={(e) => setCheckInCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="font-mono uppercase tracking-widest"
            />
            <Button onClick={handleCheckIn} disabled={isPending || !checkInCode.trim()}>Check in</Button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-5 w-5 text-accent" />
              Active QR sessions
            </CardTitle>
            <CardDescription>{activeSessions.length} active</CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setOpen(true)}>Generate QR</Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {activeSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions. Generate one for a meeting or event.</p>
          ) : (
            activeSessions.map((session) => (
              <div key={session.id} className="rounded-[var(--radius-md)] border border-border p-4">
                <p className="font-medium text-primary">{getTitle(session)}</p>
                <p className="font-mono text-2xl tracking-widest text-accent">{session.code}</p>
                <p className="text-xs text-muted-foreground">
                  Expires {new Date(session.expires_at).toLocaleString("en-IN")}
                </p>
                <Badge variant="accent" className="mt-2">Active</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Modal open={open} onOpenChange={setOpen} title="Generate QR session">
        <CreateForm
          action={createQrSession}
          onSuccess={() => { setOpen(false); router.refresh(); }}
          fields={[
            {
              name: "meeting_id",
              label: "Meeting",
              options: meetings.map((m) => ({ value: m.id, label: m.title })),
            },
            {
              name: "event_id",
              label: "Event",
              options: events.map((e) => ({ value: e.id, label: e.title })),
            },
          ]}
          submitLabel="Generate code"
        />
      </Modal>
    </div>
  );
}
