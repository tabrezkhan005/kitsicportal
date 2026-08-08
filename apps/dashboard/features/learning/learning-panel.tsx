"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@kitsic/ui";
import { Gamepad2, GraduationCap, Plus, Star, Target, Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageCreateButton } from "@/components/page-create-button";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { submitLearningModule } from "@/lib/platform-actions";
import { LearningLeaderboard } from "@/features/learning/learning-leaderboard";
import { QuizPlayer } from "@/features/learning/quiz-player";
import { CreateQuizForm } from "@/features/learning/create-quiz-form";
import { CreateAssignmentForm } from "@/features/learning/create-assignment-form";
import type { PlayerQuestion } from "@/lib/learning-types";
import { toActionErrorMessage } from "@/lib/action-error";

interface LearningModule {
  id: string;
  title: string;
  description: string | null;
  type: string;
  playerQuestions: PlayerQuestion[];
  questionCount: number;
  due_date: string | null;
  is_published: boolean;
  submission: { score: number | null; status: string; points_earned?: number } | null;
}

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

interface LearningPanelProps {
  modules: LearningModule[];
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
  userStats: {
    learningPoints: number;
    modulesCompleted: number;
    avgQuizScore: number;
    contributionScore: number;
  };
  peerOnlyLeaderboard?: boolean;
  canManage?: boolean;
}

export function LearningPanel({
  modules,
  leaderboard,
  currentUserId,
  userStats,
  peerOnlyLeaderboard = true,
  canManage = false,
}: LearningPanelProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const published = canManage ? modules : modules.filter((m) => m.is_published);
  const active = published.find((m) => m.id === activeId) ?? null;
  const pendingCount = published.filter((m) => !m.submission).length;

  const statCards = [
    { label: "Your points", value: userStats.learningPoints, icon: Star },
    { label: "Modules done", value: userStats.modulesCompleted, icon: GraduationCap },
    { label: "Avg quiz score", value: userStats.avgQuizScore > 0 ? `${userStats.avgQuizScore}%` : "—", icon: Target },
    { label: "Total score", value: userStats.contributionScore, icon: Trophy },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Learning"
        description="Interactive quizzes with instant feedback — earn points for the leaderboard"
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <PageCreateButton label="Create quiz" onClick={() => setCreateOpen(true)} />
              <Button type="button" variant="outline" className="font-ui rounded-lg" onClick={() => setCreateAssignmentOpen(true)}>
                <Plus className="h-4 w-4" />
                Add assignment
              </Button>
            </div>
          ) : undefined
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <article key={stat.label} className="dashboard-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">{stat.label}</p>
              <div className="overview-stat-icon">
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="dashboard-stat-value mt-3 text-3xl font-bold text-primary">{stat.value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {published.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No learning modules yet" description="Leadership can publish quizzes and assignments here." />
          ) : (
            <>
              {pendingCount > 0 && (
                <p className="font-body text-sm text-muted">
                  {pendingCount} module{pendingCount === 1 ? "" : "s"} waiting for you — complete them to earn points.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {published.map((module) => (
                  <Card key={module.id} className="dashboard-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="font-display text-primary">{module.title}</CardTitle>
                        <Badge variant={module.type === "quiz" ? "default" : "muted"} className="capitalize shrink-0">
                          {module.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {module.description && <p className="font-body text-sm text-muted line-clamp-2">{module.description}</p>}
                      <div className="flex flex-wrap gap-2 text-xs text-muted font-body">
                        {module.questionCount > 0 && (
                          <span>{module.questionCount} question{module.questionCount === 1 ? "" : "s"}</span>
                        )}
                        {module.type === "quiz" && !module.submission && (
                          <span>· Up to {module.questionCount * 15 + 25} pts</span>
                        )}
                        {module.type === "assignment" && !module.submission && <span>· 40 pts on submit</span>}
                        {module.due_date && (
                          <span>· Due {new Date(module.due_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                        )}
                      </div>
                      {module.submission ? (
                        <div className="rounded-lg bg-primary/5 px-3 py-2">
                          <p className="font-ui text-sm font-semibold text-primary">
                            Completed
                            {module.submission.score != null && ` · ${module.submission.score}%`}
                            {module.submission.points_earned != null && module.submission.points_earned > 0 && (
                              <span className="text-accent"> · +{module.submission.points_earned} pts</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <Button type="button" size="sm" className="font-ui w-full" onClick={() => setActiveId(module.id)}>
                          {module.type === "quiz" ? (
                            <>
                              <Gamepad2 className="mr-1.5 h-4 w-4" />
                              Play quiz
                            </>
                          ) : (
                            `Start ${module.type}`
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="xl:col-span-1">
          <LearningLeaderboard entries={leaderboard} currentUserId={currentUserId} peerOnly={peerOnlyLeaderboard} />
        </div>
      </div>

      <Modal
        open={!!active}
        onOpenChange={(open) => !open && setActiveId(null)}
        title={active?.title ?? "Learning module"}
        size={active?.type === "quiz" ? "wide" : "default"}
      >
        {active?.type === "quiz" ? (
          <QuizPlayer
            moduleId={active.id}
            title={active.title}
            questions={active.playerQuestions}
            onDone={() => setActiveId(null)}
          />
        ) : (
          active && <AssignmentSubmissionForm module={active} onDone={() => setActiveId(null)} />
        )}
      </Modal>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Create quiz" size="wide">
        <CreateQuizForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen} title="Create assignment">
        <CreateAssignmentForm onSuccess={() => setCreateAssignmentOpen(false)} />
      </Modal>
    </div>
  );
}

function AssignmentSubmissionForm({
  module,
  onDone,
}: {
  module: LearningModule;
  onDone: () => void;
}) {
  const router = useRouter();
  const prompt = module.playerQuestions[0]?.prompt ?? "Your response";
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pointsEarned?: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const answer = (formData.get("answer") as string) ?? "";
    formData.set("module_id", module.id);
    formData.set("answers", JSON.stringify({ a1: answer }));

    startTransition(async () => {
      try {
        const response = await submitLearningModule(formData);
        if (response.error) {
          setError(response.error);
          return;
        }
        setResult(response.data as { pointsEarned?: number });
        router.refresh();
      } catch (err) {
        setError(toActionErrorMessage(err, "Could not submit assignment."));
      }
    });
  }

  if (result) {
    return (
      <div className="space-y-4 py-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
          <Trophy className="h-8 w-8 text-accent" />
        </div>
        <p className="font-display text-xl font-bold text-primary">Submitted!</p>
        {result.pointsEarned != null && (
          <p className="font-ui text-lg font-semibold text-accent">+{result.pointsEarned} points earned</p>
        )}
        <Button type="button" className="w-full rounded-xl font-ui" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <label className="block space-y-1.5">
        <span className="font-ui text-sm font-semibold text-primary">{prompt}</span>
        <textarea
          name="answer"
          required
          rows={5}
          disabled={isPending}
          className="w-full rounded-xl border border-[var(--dashboard-border)] px-3 py-2 font-body text-sm"
          placeholder="Write your response…"
        />
      </label>
      <Button type="submit" disabled={isPending} className="font-ui w-full rounded-xl">
        {isPending ? "Submitting…" : "Submit & earn points"}
      </Button>
    </form>
  );
}
