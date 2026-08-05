import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { Award, CheckCircle2, FolderKanban, GraduationCap, TrendingUp, Users } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";

interface ProfileDashboardProps {
  performance: {
    tasksAssigned: number;
    tasksCompleted: number;
    taskCompletionRate: number;
    attendanceRate: number;
    certificatesEarned: number;
    projectsJoined: number;
    contributionScore: number;
    learningPoints: number;
    modulesCompleted: number;
    avgQuizScore: number;
  };
  certificates: Array<{
    id: string;
    title: string;
    type: string;
    issued_at: string;
    issuer: { full_name: string | null } | { full_name: string | null }[] | null;
  }>;
  leaderboard: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    avatar_color?: string;
    member_id?: string | null;
    contributionScore: number;
    learningPoints: number;
    roles: string[];
  }>;
  currentUserId: string;
}

function getIssuerName(issuer: ProfileDashboardProps["certificates"][0]["issuer"]) {
  if (!issuer) return "Club";
  if (Array.isArray(issuer)) return issuer[0]?.full_name ?? "Club";
  return issuer.full_name ?? "Club";
}

export function ProfileDashboard({ performance, certificates, leaderboard, currentUserId }: ProfileDashboardProps) {
  const rank = leaderboard.findIndex((m) => m.id === currentUserId) + 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-accent" /> Contribution score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{performance.contributionScore}</p>
            {rank > 0 && <p className="text-xs text-muted-foreground">Rank #{rank} on leaderboard</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-accent" /> Tasks completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{performance.tasksCompleted}/{performance.tasksAssigned}</p>
            <p className="text-xs text-muted-foreground">{performance.taskCompletionRate}% completion rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-accent" /> Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{performance.attendanceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4 text-accent" /> Learning points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{performance.learningPoints}</p>
            <p className="text-xs text-muted-foreground">{performance.modulesCompleted} modules · {performance.avgQuizScore}% avg quiz</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderKanban className="h-4 w-4 text-accent" /> Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{performance.projectsJoined}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Certificates
            </CardTitle>
            <CardDescription>{certificates.length} earned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No certificates yet.</p>
            ) : (
              certificates.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-border p-3">
                  <div>
                    <p className="font-medium text-primary">{cert.title}</p>
                    <p className="text-xs text-muted-foreground">Issued by {getIssuerName(cert.issuer)}</p>
                  </div>
                  <Badge variant="accent" className="capitalize text-[10px]">{cert.type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Top contributors this academic year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.slice(0, 8).map((member, index) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 rounded-[var(--radius-md)] p-2 ${member.id === currentUserId ? "bg-accent/10" : ""}`}
              >
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{index + 1}</span>
                <UserAvatar
                  name={member.full_name}
                  avatarUrl={member.avatar_url}
                  avatarColor={member.avatar_color}
                  size="sm"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">{member.full_name ?? "Member"}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.member_id ?? member.roles[0]?.replace("_", " ")}
                    {member.learningPoints > 0 && ` · ${member.learningPoints} learning pts`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-accent">{member.contributionScore}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
