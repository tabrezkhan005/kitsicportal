"use client";

import { Trophy } from "lucide-react";
import { Badge } from "@kitsic/ui";
import { UserAvatar } from "@/components/user-avatar";

interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_color?: string;
  member_id?: string | null;
  contributionScore: number;
  learningPoints: number;
  modulesCompleted: number;
  avgQuizScore: number;
  roles: string[];
}

interface LearningLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  peerOnly?: boolean;
}

export function LearningLeaderboard({ entries, currentUserId, peerOnly = true }: LearningLeaderboardProps) {
  const top = entries.slice(0, 10);
  const myRank = entries.findIndex((e) => e.id === currentUserId) + 1;

  return (
    <section id="leaderboard" className="dashboard-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--dashboard-border-subtle)] px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <Trophy className="h-5 w-5 text-accent" />
            Leaderboard
          </h2>
          <p className="font-body text-sm text-muted">
            {peerOnly
              ? "Member rankings — peers only (leadership & heads excluded)"
              : "All club members ranked by contribution & learning points"}
          </p>
        </div>
        {myRank > 0 && (
          <Badge variant="default" className="font-mono-brand">Your rank #{myRank}</Badge>
        )}
      </div>

      {top.length === 0 ? (
        <p className="px-6 py-8 text-center font-body text-sm text-muted">Complete quizzes to earn points and climb the board.</p>
      ) : (
        <ul className="divide-y divide-[var(--dashboard-border-subtle)]">
          {top.map((member, index) => {
            const isMe = member.id === currentUserId;
            return (
              <li
                key={member.id}
                className={`flex items-center gap-4 px-6 py-3 ${isMe ? "bg-primary/5" : ""}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-ui text-xs font-bold ${
                    index === 0
                      ? "bg-accent text-white"
                      : index === 1
                        ? "bg-primary/15 text-primary"
                        : index === 2
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/30 text-muted"
                  }`}
                >
                  {index === 0 ? <Trophy className="h-3.5 w-3.5" /> : index + 1}
                </span>

                <UserAvatar
                  name={member.full_name}
                  avatarUrl={member.avatar_url}
                  avatarColor={member.avatar_color}
                  size="sm"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-sm font-semibold text-primary">
                    {member.full_name ?? "Member"}
                    {isMe && <span className="ml-1 text-xs font-normal text-muted">(you)</span>}
                  </p>
                  <p className="font-body text-xs text-muted">
                    {member.member_id ?? "—"}
                    {member.modulesCompleted > 0 && ` · ${member.modulesCompleted} modules`}
                    {member.avgQuizScore > 0 && ` · ${member.avgQuizScore}% avg quiz`}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-display text-lg font-bold text-primary">{member.contributionScore}</p>
                  <p className="font-body text-[10px] text-muted">
                    {member.learningPoints > 0 ? `${member.learningPoints} learning pts` : "pts"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
