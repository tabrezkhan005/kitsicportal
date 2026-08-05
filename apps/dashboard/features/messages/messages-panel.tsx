"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@kitsic/ui";
import { Mail, Send } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { markLeadershipMessageRead, sendLeadershipMessage } from "@/lib/platform-actions";
import { LEADERSHIP_ROLES } from "@/lib/platform-constants";

interface Message {
  id: string;
  subject: string;
  body: string;
  recipient_role: string;
  is_read: boolean;
  created_at: string;
  sender: { full_name: string | null; email: string; member_id: string | null } | null;
}

interface MessagesPanelProps {
  messages: Message[];
  canSend?: boolean;
  canReadInbox?: boolean;
}

export function MessagesPanel({ messages, canSend = false, canReadInbox = false }: MessagesPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Messages"
        description={canReadInbox ? "Messages from members to leadership" : "Contact Gen-4 leadership directly"}
        actions={
          canSend ? (
            <Button type="button" className="font-ui rounded-lg" onClick={() => setOpen(true)}>
              <Send className="h-4 w-4" />
              New message
            </Button>
          ) : undefined
        }
      />

      {messages.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No messages yet"
          description={canSend ? "Send a message to President, VP, Secretary, or Treasurer." : "Member messages will appear here."}
          action={
            canSend ? (
              <Button type="button" onClick={() => setOpen(true)} className="font-ui rounded-lg">
                <Send className="h-4 w-4" />
                Send first message
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <Card key={message.id} className="dashboard-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-display text-base text-primary">{message.subject}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="muted" className="capitalize">{message.recipient_role.replace(/_/g, " ")}</Badge>
                    {!message.is_read && canReadInbox && <Badge variant="accent">New</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-body text-sm text-muted">
                  From {message.sender?.full_name ?? message.sender?.email ?? "Member"}
                  {message.sender?.member_id ? ` · ${message.sender.member_id}` : ""}
                  {" · "}
                  {new Date(message.created_at).toLocaleString("en-IN")}
                </p>
                <p className="font-body text-sm text-primary whitespace-pre-wrap">{message.body}</p>
                {canReadInbox && !message.is_read && (
                  <MarkReadButton messageId={message.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} title="Message leadership">
        <CreateForm
          action={sendLeadershipMessage}
          onSuccess={() => setOpen(false)}
          submitLabel="Send message"
          fields={[
            {
              name: "recipient_role",
              label: "Send to",
              required: true,
              options: LEADERSHIP_ROLES.map((r) => ({ value: r.slug, label: r.label })),
            },
            { name: "subject", label: "Subject", required: true },
            { name: "body", label: "Message", type: "textarea", required: true },
          ]}
        />
      </Modal>
    </div>
  );
}

function MarkReadButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="font-ui"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markLeadershipMessageRead(messageId);
          router.refresh();
        })
      }
    >
      Mark read
    </Button>
  );
}
