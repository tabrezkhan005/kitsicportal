"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { Megaphone, Pin, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageCreateButton } from "@/components/page-create-button";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { createAnnouncement, toggleAnnouncementPin } from "@/lib/actions";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

interface AnnouncementsFeedProps {
  announcements: Announcement[];
  canManage?: boolean;
}

export function AnnouncementsFeed({ announcements, canManage = false }: AnnouncementsFeedProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handlePin(id: string, pinned: boolean) {
    startTransition(async () => {
      await toggleAnnouncementPin(id, pinned);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Club-wide updates and notices"
        actions={
          canManage ? (
            <PageCreateButton label="New announcement" onClick={() => setOpen(true)} />
          ) : undefined
        }
      />

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="Post updates, reminders, and news for all club members."
          action={
            canManage ? (
              <Button type="button" onClick={() => setOpen(true)} className="font-ui rounded-xl">
                <Plus className="h-4 w-4" />
                Post announcement
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <Card
              key={item.id}
              className={
                item.is_pinned
                  ? "dashboard-card border-accent/30 bg-accent/5"
                  : "dashboard-card border-primary/10"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <CardTitle className="font-display text-primary">{item.title}</CardTitle>
                    {item.is_pinned && <Badge variant="accent">Pinned</Badge>}
                  </div>
                  {canManage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handlePin(item.id, !item.is_pinned)}
                      className="shrink-0 font-ui"
                    >
                      <Pin className="h-3.5 w-3.5" />
                      {item.is_pinned ? "Unpin" : "Pin"}
                    </Button>
                  )}
                </div>
                <CardDescription className="font-body">
                  {new Date(item.created_at).toLocaleDateString("en-IN", { dateStyle: "full" })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm leading-relaxed text-primary/65">{item.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} title="New announcement">
        <CreateForm
          action={createAnnouncement}
          onSuccess={() => setOpen(false)}
          fields={[
            { name: "title", label: "Title", required: true },
            { name: "content", label: "Content", type: "textarea", required: true },
          ]}
        />
      </Modal>
    </div>
  );
}
