"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { CalendarDays, Lightbulb, MapPin, Paperclip, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageCreateButton } from "@/components/page-create-button";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { createEvent } from "@/lib/actions";
import { reviewEventProposal } from "@/lib/platform-actions";
import { ProposeEventForm } from "@/features/events/propose-event-form";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  status: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  proposed_starts_at: string | null;
  status: string;
  proposed_by?: string;
  proposer: { full_name: string | null; email: string } | null;
  attachments: { file_name: string; file_url: string }[];
}

interface EventsGridProps {
  events: Event[];
  proposals: Proposal[];
  canManage?: boolean;
  canPropose?: boolean;
  currentUserId?: string;
}

export function EventsGrid({ events, proposals, canManage = false, canPropose = false, currentUserId }: EventsGridProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const myProposals = currentUserId ? proposals.filter((p) => p.proposed_by === currentUserId) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Events"
        description="Club events and member proposals"
        actions={
          <div className="flex flex-wrap gap-2">
            {canPropose && (
              <Button type="button" variant="outline" className="font-ui rounded-lg" onClick={() => setProposeOpen(true)}>
                <Lightbulb className="h-4 w-4" />
                Propose event
              </Button>
            )}
            {canManage && <PageCreateButton label="Create event" onClick={() => setCreateOpen(true)} />}
          </div>
        }
      />

      {canPropose && myProposals.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-primary">Your proposals</h2>
          {myProposals.map((proposal) => (
            <Card key={proposal.id} className="dashboard-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-display text-primary">{proposal.title}</CardTitle>
                  <Badge variant="muted" className="capitalize">{proposal.status}</Badge>
                </div>
              </CardHeader>
              {proposal.description && (
                <CardContent>
                  <p className="font-body text-sm text-muted">{proposal.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </section>
      )}

      {canManage && proposals.filter((p) => p.status === "pending").length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-primary">Pending proposals</h2>
          {proposals
            .filter((p) => p.status === "pending")
            .map((proposal) => (
              <Card key={proposal.id} className="dashboard-card">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-primary">{proposal.title}</CardTitle>
                  <CardDescription className="font-body">
                    By {proposal.proposer?.full_name ?? proposal.proposer?.email ?? "Member"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {proposal.description && <p className="font-body text-sm text-muted">{proposal.description}</p>}
                  {proposal.attachments?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {proposal.attachments.map((file) => (
                        <a
                          key={file.file_url}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dashboard-action-btn font-ui text-xs"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          {file.file_name}
                        </a>
                      ))}
                    </div>
                  )}
                  <ProposalReviewActions proposalId={proposal.id} />
                </CardContent>
              </Card>
            ))}
        </section>
      )}

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Approved proposals and leadership-created events appear here."
          action={
            canPropose ? (
              <Button type="button" onClick={() => setProposeOpen(true)} className="font-ui rounded-lg">
                <Plus className="h-4 w-4" />
                Propose an event
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="dashboard-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-display text-primary">{event.title}</CardTitle>
                  <Badge variant="default" className="shrink-0 capitalize">{event.status}</Badge>
                </div>
                {event.description && <CardDescription className="font-body">{event.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted font-body">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  {new Date(event.starts_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {event.location}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={proposeOpen} onOpenChange={setProposeOpen} title="Propose an event">
        <div className="max-h-[70dvh] overflow-y-auto pr-1">
          <ProposeEventForm onSuccess={() => setProposeOpen(false)} />
        </div>
      </Modal>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Create event">
        <CreateForm
          action={createEvent}
          onSuccess={() => setCreateOpen(false)}
          fields={[
            { name: "title", label: "Title", required: true },
            { name: "description", label: "Description", type: "textarea" },
            { name: "location", label: "Location" },
            { name: "starts_at", label: "Starts at", type: "datetime-local", required: true },
            { name: "ends_at", label: "Ends at", type: "datetime-local" },
          ]}
        />
      </Modal>
    </div>
  );
}

function ProposalReviewActions({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function review(decision: "approved" | "rejected") {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("proposal_id", proposalId);
      formData.set("decision", decision);
      await reviewEventProposal(formData);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" className="font-ui" disabled={isPending} onClick={() => review("approved")}>
        Approve
      </Button>
      <Button type="button" size="sm" variant="outline" className="font-ui" disabled={isPending} onClick={() => review("rejected")}>
        Reject
      </Button>
    </div>
  );
}
