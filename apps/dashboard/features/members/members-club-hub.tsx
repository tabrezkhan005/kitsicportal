"use client";

import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@kitsic/ui";
import { CalendarDays, GraduationCap, Lightbulb, Video } from "lucide-react";

interface HubEvent {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  status: string;
}

interface HubMeeting {
  id: string;
  title: string;
  starts_at: string;
  meet_link: string | null;
  status: string;
  meeting_mode?: string | null;
}

interface HubLearningModule {
  id: string;
  title: string;
  type: string;
  due_date: string | null;
}

interface HubProposal {
  id: string;
  title: string;
  status: string;
  proposed_starts_at: string | null;
}

interface MembersClubHubProps {
  events: HubEvent[];
  meetings: HubMeeting[];
  learningModules: HubLearningModule[];
  myProposals: HubProposal[];
}

function formatWhen(date: string) {
  return new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function MembersClubHub({ events, meetings, learningModules, myProposals }: MembersClubHubProps) {
  const hasContent = events.length > 0 || meetings.length > 0 || learningModules.length > 0 || myProposals.length > 0;

  if (!hasContent) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-primary">Club activity</h2>
          <p className="font-body text-sm text-muted">Upcoming events, meetings, and learning for all members</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="font-ui">
            <Link href="/events">All events</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="font-ui">
            <Link href="/meetings">All meetings</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card className="dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-sm text-primary">
              <CalendarDays className="h-4 w-4" />
              Upcoming events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 ? (
              <p className="font-body text-sm text-muted">No upcoming events</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="font-ui text-sm font-medium text-primary">{event.title}</p>
                  <p className="font-body text-xs text-muted">{formatWhen(event.starts_at)}</p>
                  {event.location && <p className="font-body text-xs text-muted">{event.location}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-sm text-primary">
              <Video className="h-4 w-4" />
              Upcoming meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {meetings.length === 0 ? (
              <p className="font-body text-sm text-muted">No upcoming meetings</p>
            ) : (
              meetings.map((meeting) => (
                <div key={meeting.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="font-ui text-sm font-medium text-primary">{meeting.title}</p>
                  <p className="font-body text-xs text-muted">{formatWhen(meeting.starts_at)}</p>
                  {meeting.meet_link && (
                    <a
                      href={meeting.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-xs text-accent hover:underline"
                    >
                      Join link
                    </a>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-sm text-primary">
              <GraduationCap className="h-4 w-4" />
              Learning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {learningModules.length === 0 ? (
              <p className="font-body text-sm text-muted">No modules yet</p>
            ) : (
              learningModules.map((module) => (
                <Link
                  key={module.id}
                  href="/learning"
                  className="block rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/30"
                >
                  <p className="font-ui text-sm font-medium text-primary">{module.title}</p>
                  <p className="font-body text-xs capitalize text-muted">{module.type}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-sm text-primary">
              <Lightbulb className="h-4 w-4" />
              Your proposals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myProposals.length === 0 ? (
              <p className="font-body text-sm text-muted">
                No proposals yet.{" "}
                <Link href="/events" className="text-accent hover:underline">
                  Propose an event
                </Link>
              </p>
            ) : (
              myProposals.map((proposal) => (
                <div key={proposal.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                  <div>
                    <p className="font-ui text-sm font-medium text-primary">{proposal.title}</p>
                    {proposal.proposed_starts_at && (
                      <p className="font-body text-xs text-muted">{formatWhen(proposal.proposed_starts_at)}</p>
                    )}
                  </div>
                  <Badge variant="muted" className="capitalize shrink-0">{proposal.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
