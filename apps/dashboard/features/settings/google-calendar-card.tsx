"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { Calendar, Link2, RefreshCw, Unplug } from "lucide-react";
import { disconnectGoogleCalendar } from "@/lib/actions";

interface GoogleCalendarCardProps {
  connected: boolean;
  email?: string;
  connectedAt?: string;
  canManage?: boolean;
}

export function GoogleCalendarCard({
  connected,
  email,
  connectedAt,
  canManage = false,
}: GoogleCalendarCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectGoogleCalendar();
      router.refresh();
    });
  }

  async function handleReconnect() {
    startTransition(async () => {
      await disconnectGoogleCalendar();
      window.location.href = "/api/google/connect";
    });
  }

  return (
    <Card className="dashboard-card border-primary/10 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-accent" />
          Google Calendar &amp; Meet
        </CardTitle>
        <CardDescription>
          Connect once to create real Google Meet links and sync attendance automatically.
          If scheduling shows <span className="font-mono text-xs">invalid_grant</span>, reconnect here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {connected ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="accent">Connected</Badge>
                <span className="text-sm font-medium text-primary">{email}</span>
              </div>
              {connectedAt && (
                <p className="text-xs text-muted-foreground">
                  Connected {new Date(connectedAt).toLocaleString("en-IN")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not connected. Schedule meetings with auto-generated Meet links after connecting.
            </p>
          )}
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            {connected ? (
              <>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handleReconnect}
                  className="font-ui rounded-xl"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconnect Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleDisconnect}
                  className="font-ui rounded-xl"
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button asChild className="font-ui rounded-xl">
                <a href="/api/google/connect">
                  <Link2 className="h-4 w-4" />
                  Connect Google
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
