import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { QrCode } from "lucide-react";

interface QrSession {
  id: string;
  code: string;
  expires_at: string;
  is_active: boolean;
  meeting: { title: string } | { title: string }[] | null;
  event: { title: string } | { title: string }[] | null;
}

interface QrSessionsPanelProps {
  sessions: QrSession[];
}

function getTitle(session: QrSession) {
  const meeting = session.meeting;
  const event = session.event;
  if (meeting) {
    if (Array.isArray(meeting)) return meeting[0]?.title ?? "Meeting";
    return meeting.title;
  }
  if (event) {
    if (Array.isArray(event)) return event[0]?.title ?? "Event";
    return event.title;
  }
  return "General session";
}

export function QrSessionsPanel({ sessions }: QrSessionsPanelProps) {
  const activeSessions = sessions.filter((s) => s.is_active && new Date(s.expires_at) > new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-accent" />
          QR Attendance Sessions
        </CardTitle>
        <CardDescription>Active QR codes for meeting and event check-in</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active QR sessions. Sessions are created when meetings or events start.</p>
        ) : (
          activeSessions.map((session) => (
            <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-4">
              <div>
                <p className="font-medium text-primary">{getTitle(session)}</p>
                <p className="font-mono text-lg tracking-widest text-accent">{session.code}</p>
                <p className="text-xs text-muted-foreground">
                  Expires {new Date(session.expires_at).toLocaleString("en-IN")}
                </p>
              </div>
              <Badge variant="accent">Active</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
