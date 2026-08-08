import { requirePermission } from "@kitsic/auth";
import { getLeaderboardForViewer, getMemberPerformance } from "@/lib/data";
import { getLearningModules } from "@/lib/platform-data";
import { viewerSeesFullLeaderboard } from "@/lib/leaderboard-utils";
import { stripQuestionsForPlayer, normalizeQuestions } from "@/lib/learning-questions";
import { ForbiddenPage } from "@/components/forbidden-page";
import { LearningPanel } from "@/features/learning/learning-panel";

export const metadata = { title: "Learning" };

export default async function LearningPage() {
  let user;
  try {
    user = await requirePermission("learning.read");
  } catch {
    return <ForbiddenPage />;
  }

  const [modules, leaderboard, userStats] = await Promise.all([
    getLearningModules(user.id),
    getLeaderboardForViewer(user.id),
    getMemberPerformance(user.id),
  ]);

  const panelModules = modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    type: module.type,
    due_date: module.due_date,
    is_published: module.is_published,
    submission: module.submission,
    playerQuestions: stripQuestionsForPlayer(module.questions),
    questionCount: normalizeQuestions(module.questions).length,
  }));

  return (
    <LearningPanel
      modules={panelModules}
      leaderboard={leaderboard}
      currentUserId={user.id}
      userStats={{
        learningPoints: userStats.learningPoints,
        modulesCompleted: userStats.modulesCompleted,
        avgQuizScore: userStats.avgQuizScore,
        contributionScore: userStats.contributionScore,
      }}
      peerOnlyLeaderboard={!viewerSeesFullLeaderboard(user.roles)}
      canManage={user.permissions.includes("learning.manage")}
    />
  );
}
