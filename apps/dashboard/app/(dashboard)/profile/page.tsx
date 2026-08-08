import { getSessionUser } from "@kitsic/auth";
import { createAdminClient } from "@kitsic/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { getCertificates, getLeaderboardForViewer, getMemberPerformance } from "@/lib/data";
import { getAvatarColorForUser } from "@/lib/avatar-color";
import { PageHeader } from "@/components/page-header";
import { UserAvatar } from "@/components/user-avatar";
import { ProfileDashboard } from "@/features/profile/profile-dashboard";
import { ProfileEditForm } from "@/features/profile/profile-edit-form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) return null;

  const admin = createAdminClient();
  const [{ data: profile }, performance, certificates, leaderboard] = await Promise.all([
    admin.from("users").select("phone, member_id, avatar_color, skills, avatar_url, roll_number, branch").eq("id", user.id).single(),
    getMemberPerformance(user.id),
    getCertificates(user.id),
    getLeaderboardForViewer(user.id),
  ]);

  const avatarColor = getAvatarColorForUser(user.id);
  const skills = (profile?.skills as string[] | null) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Profile" description="Your club member profile and performance" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dashboard-card">
          <CardHeader>
            <div className="flex items-center gap-4">
              <UserAvatar
                name={user.fullName}
                email={user.email}
                avatarUrl={profile?.avatar_url ?? user.avatarUrl}
                avatarColor={avatarColor}
                size="lg"
              />
              <div>
                <CardTitle className="font-display">{user.fullName ?? "Member"}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {profile?.member_id && (
              <div className="flex justify-between border-b border-[var(--dashboard-border-subtle)] py-2">
                <span className="text-muted">Member ID</span>
                <span className="font-mono-brand text-primary">{profile.member_id}</span>
              </div>
            )}
            {profile?.roll_number && (
              <div className="flex justify-between border-b border-[var(--dashboard-border-subtle)] py-2">
                <span className="text-muted">Roll number</span>
                <span>{profile.roll_number}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-[var(--dashboard-border-subtle)] py-2">
              <span className="text-muted">Roles</span>
              <span className="capitalize">{user.roles.join(", ").replace(/_/g, " ")}</span>
            </div>
            {skills.length > 0 && (
              <div className="pt-1">
                <p className="mb-2 text-muted">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-[var(--dashboard-muted-surface)] px-2.5 py-0.5 font-ui text-xs text-primary">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {user.permissions.includes("profile.update") && (
          <ProfileEditForm
            userId={user.id}
            fullName={user.fullName}
            email={user.email}
            phone={profile?.phone ?? null}
            avatarUrl={profile?.avatar_url ?? user.avatarUrl}
            memberId={profile?.member_id ?? null}
            skills={skills}
          />
        )}
      </div>

      <ProfileDashboard
        performance={performance}
        certificates={certificates}
        leaderboard={leaderboard}
        currentUserId={user.id}
      />
    </div>
  );
}
