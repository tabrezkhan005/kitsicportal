"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent } from "@kitsic/ui";
import { formatRelativeTime } from "@kitsic/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsListProps {
  notifications: Notification[];
}

export function NotificationsList({ notifications }: NotificationsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={isPending}>
            Mark all read
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">All caught up — no notifications yet.</CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.is_read ? "border-border/60 opacity-70" : "border-accent/30 bg-accent/5"}
            >
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-primary">{notification.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant="muted">{notification.type}</Badge>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(notification.created_at)}</span>
                  {!notification.is_read && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleMarkRead(notification.id)} disabled={isPending}>
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
