"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kitsic/ui";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Search,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { assignMemberRole, issueCertificate } from "@/lib/actions";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { MembersClubHub } from "@/features/members/members-club-hub";
import { UserAvatar } from "@/components/user-avatar";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_color?: string;
  member_id?: string | null;
  skills?: string[];
  created_at: string;
  department: string | null;
  roles: string[];
  roleSlugs: string[];
  tasksAssigned: number;
  tasksCompleted: number;
  taskCompletionRate: number;
  attendanceRate: number;
  certificatesEarned: number;
  projectsJoined: number;
  contributionScore: number;
}

interface Role {
  id: string;
  slug: string;
  name: string;
}

interface MembersStats {
  total: number;
  leadership: number;
  newThisMonth: number;
  activeContributors: number;
}

interface MembersHubData {
  events: { id: string; title: string; starts_at: string; location: string | null; status: string }[];
  meetings: { id: string; title: string; starts_at: string; meet_link: string | null; status: string; meeting_mode?: string | null }[];
  learningModules: { id: string; title: string; type: string; due_date: string | null }[];
  myProposals: { id: string; title: string; status: string; proposed_starts_at: string | null }[];
}

interface MembersDashboardProps {
  members: Member[];
  roles: Role[];
  stats: MembersStats;
  hub?: MembersHubData;
  canAssignRoles?: boolean;
  canIssueCertificates?: boolean;
}

const LEADERSHIP_SLUGS = new Set(["president", "vice_president", "secretary", "treasurer"]);

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function isLeadershipMember(member: Member) {
  return member.roleSlugs.some((slug) => LEADERSHIP_SLUGS.has(slug));
}

export function MembersDashboard({
  members,
  roles,
  stats,
  hub,
  canAssignRoles = false,
  canIssueCertificates = false,
}: MembersDashboardProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [roleMember, setRoleMember] = useState<Member | null>(null);
  const [certMember, setCertMember] = useState<Member | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        !query ||
        member.full_name?.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.department?.toLowerCase().includes(query);

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "leadership" && isLeadershipMember(member)) ||
        member.roleSlugs.includes(roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [members, search, roleFilter]);

  const filterOptions = useMemo(() => {
    const options = [{ value: "all", label: "All members" }];
    if (stats.leadership > 0) {
      options.push({ value: "leadership", label: "Leadership" });
    }
    for (const role of roles) {
      if (members.some((member) => member.roleSlugs.includes(role.slug))) {
        options.push({ value: role.slug, label: role.name });
      }
    }
    return options;
  }, [members, roles, stats.leadership]);

  function handleAssignRole(roleSlug: string) {
    if (!roleMember) return;
    setRoleError(null);

    startTransition(async () => {
      const result = await assignMemberRole(roleMember.id, roleSlug);
      if (result.error) {
        setRoleError(result.error);
        return;
      }
      setRoleMember(null);
      setSelectedMember(null);
      router.refresh();
    });
  }

  const statCards = [
    { label: "Total members", value: stats.total, icon: Users },
    { label: "Leadership", value: stats.leadership, icon: Shield },
    { label: "Joined this month", value: stats.newThisMonth, icon: UserPlus },
    { label: "Active contributors", value: stats.activeContributors, icon: TrendingUp },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Members"
        description="Club directory, roles, and member activity"
      />

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <article key={stat.label} className="dashboard-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">
                {stat.label}
              </p>
              <div className="overview-stat-icon">
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="dashboard-stat-value mt-3 text-3xl font-bold text-primary">{stat.value}</p>
          </article>
        ))}
      </section>

      {hub && (
        <MembersClubHub
          events={hub.events}
          meetings={hub.meetings}
          learningModules={hub.learningModules}
          myProposals={hub.myProposals}
        />
      )}

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members found"
          description="Members appear here once they sign up and are added to the club."
        />
      ) : (
        <>
          {/* Toolbar */}
          <div className="dashboard-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, or department…"
                className="pl-9 font-body"
              />
            </div>
            <p className="shrink-0 font-body text-sm text-muted">
              {filteredMembers.length} of {members.length} shown
            </p>
          </div>

          {/* Role filters */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRoleFilter(option.value)}
                className={[
                  "rounded-full px-3.5 py-1.5 font-ui text-xs font-semibold transition-colors",
                  roleFilter === option.value
                    ? "members-filter-active"
                    : "members-filter-inactive",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Table */}
          {filteredMembers.length === 0 ? (
            <div className="dashboard-card px-6 py-12 text-center">
              <p className="font-body text-sm text-muted">No members match your search or filter.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 font-ui"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="dashboard-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-ui">Member</TableHead>
                    <TableHead className="font-ui">Role</TableHead>
                    <TableHead className="font-ui">Contribution</TableHead>
                    <TableHead className="font-ui">Joined</TableHead>
                    {(canAssignRoles || canIssueCertificates) && (
                      <TableHead className="font-ui text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow
                      key={member.id}
                      className="members-table-row cursor-pointer"
                      onClick={() => setSelectedMember(member)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={member.full_name}
                            email={member.email}
                            avatarUrl={member.avatar_url}
                            avatarColor={member.avatar_color}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-ui text-sm font-semibold text-primary">
                              {member.full_name ?? "Unnamed member"}
                            </p>
                            <p className="truncate font-mono-brand text-[11px] text-muted">
                              {member.member_id ?? member.email}
                            </p>
                            {member.department && (
                              <p className="truncate font-body text-[11px] text-muted/80">
                                {member.department}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles.length === 0 ? (
                            <span className="font-body text-xs text-muted">No role</span>
                          ) : (
                            member.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={isLeadershipMember(member) ? "default" : "muted"}
                                className="text-[10px] font-ui"
                              >
                                {role}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-ui text-sm font-semibold text-primary">
                            {member.contributionScore}
                          </span>
                          <span className="font-body text-xs text-muted">pts</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-body text-sm text-muted">
                        {formatDate(member.created_at)}
                      </TableCell>
                      {(canAssignRoles || canIssueCertificates) && (
                        <TableCell className="text-right">
                          <div
                            className="flex flex-wrap justify-end gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {canAssignRoles && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                className="font-ui rounded-lg"
                                onClick={() => {
                                  setRoleError(null);
                                  setRoleMember(member);
                                }}
                              >
                                Role
                              </Button>
                            )}
                            {canIssueCertificates && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isPending}
                                className="font-ui rounded-lg"
                                onClick={() => setCertMember(member)}
                              >
                                <Award className="h-3.5 w-3.5" />
                                Certificate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Member detail panel */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(3,53,101,0.15)] backdrop-blur-[1px]"
            aria-label="Close member details"
            onClick={() => setSelectedMember(null)}
          />
          <aside className="members-detail-panel relative flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b border-[var(--dashboard-border-subtle)] px-6 py-5">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={selectedMember.full_name}
                  email={selectedMember.email}
                  avatarUrl={selectedMember.avatar_url}
                  avatarColor={selectedMember.avatar_color}
                  size="lg"
                />
                <div>
                  <h2 className="font-display text-lg font-bold text-primary">
                    {selectedMember.full_name ?? "Unnamed member"}
                  </h2>
                  <p className="font-mono-brand text-xs text-muted">{selectedMember.member_id ?? selectedMember.email}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                onClick={() => setSelectedMember(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 dashboard-scroll">
              <div className="flex flex-wrap gap-1.5">
                {selectedMember.roles.map((role) => (
                  <Badge key={role} variant="default" className="font-ui text-[10px]">
                    {role}
                  </Badge>
                ))}
              </div>

              {selectedMember.department && (
                <p className="mt-3 font-body text-sm text-muted">
                  Department · {selectedMember.department}
                </p>
              )}
              <p className="mt-1 font-body text-sm text-muted">
                Joined · {formatDate(selectedMember.created_at)}
              </p>
              {selectedMember.skills && selectedMember.skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selectedMember.skills.map((skill) => (
                    <Badge key={skill} variant="default" className="font-ui text-[10px]">{skill}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <DetailStat label="Contribution" value={`${selectedMember.contributionScore} pts`} />
                <DetailStat label="Tasks done" value={`${selectedMember.tasksCompleted}/${selectedMember.tasksAssigned}`} />
                <DetailStat label="Attendance" value={`${selectedMember.attendanceRate}%`} />
                <DetailStat label="Certificates" value={String(selectedMember.certificatesEarned)} />
                <DetailStat label="Projects" value={String(selectedMember.projectsJoined)} />
                <DetailStat label="Task rate" value={`${selectedMember.taskCompletionRate}%`} />
              </div>

              {(canAssignRoles || canIssueCertificates) && (
                <div className="mt-6 flex flex-col gap-2">
                  {canAssignRoles && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-ui rounded-xl"
                      onClick={() => {
                        setRoleError(null);
                        setRoleMember(selectedMember);
                      }}
                    >
                      Assign role
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                  {canIssueCertificates && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-ui rounded-xl"
                      onClick={() => setCertMember(selectedMember)}
                    >
                      Issue certificate
                      <Award className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Role modal */}
      <Modal
        open={!!roleMember}
        onOpenChange={(open) => {
          if (!open) {
            setRoleMember(null);
            setRoleError(null);
          }
        }}
        title={`Assign role — ${roleMember?.full_name ?? roleMember?.email}`}
      >
        <p className="mb-4 font-body text-sm text-muted">
          Select a role for this member. This replaces their current role assignment.
        </p>
        {roleError && (
          <p className="mb-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 font-body text-sm text-primary">
            {roleError}
          </p>
        )}
        <div className="grid gap-2">
          {roles.map((role) => {
            const isCurrent = roleMember?.roleSlugs.includes(role.slug);
            return (
              <Button
                key={role.id}
                type="button"
                variant={isCurrent ? "default" : "outline"}
                className="justify-between font-ui"
                disabled={isPending || isCurrent}
                onClick={() => handleAssignRole(role.slug)}
              >
                {role.name}
                {isCurrent && <CheckCircle2 className="h-4 w-4" />}
              </Button>
            );
          })}
        </div>
      </Modal>

      {/* Certificate modal */}
      <Modal
        open={!!certMember}
        onOpenChange={(open) => !open && setCertMember(null)}
        title={`Issue certificate — ${certMember?.full_name ?? certMember?.email}`}
      >
        {certMember && (
          <CreateForm
            action={issueCertificate}
            onSuccess={() => {
              setCertMember(null);
              router.refresh();
            }}
            submitLabel="Issue certificate"
            hiddenValues={{ user_id: certMember.id }}
            fields={[
              { name: "title", label: "Certificate title", required: true },
              {
                name: "type",
                label: "Type",
                options: [
                  { value: "participation", label: "Participation" },
                  { value: "achievement", label: "Achievement" },
                  { value: "leadership", label: "Leadership" },
                ],
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-3 overview-surface">
      <p className="font-ui text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-ui text-sm font-semibold text-primary">{value}</p>
    </div>
  );
}
