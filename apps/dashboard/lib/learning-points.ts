import { gradeAnswer, normalizeQuestions } from "@/lib/learning-questions";
import type { LearningQuestion } from "@/lib/learning-types";

export interface QuizQuestion {
  id: string;
  answer?: string;
  type?: string;
  options?: string[];
  correctIndex?: number;
  acceptableAnswers?: string[];
  prompt?: string;
}

export function scoreQuizAnswers(
  questions: QuizQuestion[],
  answers: Record<string, string>,
): { score: number; correct: number; total: number } {
  const normalized = normalizeQuestions(questions as LearningQuestion[]);
  const total = normalized.length;
  if (total === 0) return { score: 0, correct: 0, total: 0 };

  const correct = normalized.filter((question) => gradeAnswer(question, answers[question.id] ?? "").correct).length;

  return {
    correct,
    total,
    score: Math.round((correct / total) * 100),
  };
}

export function calculateLearningPoints(
  moduleType: "quiz" | "assignment",
  questions: QuizQuestion[],
  answers: Record<string, string>,
): { score: number | null; pointsEarned: number } {
  if (moduleType === "quiz") {
    const { score, correct } = scoreQuizAnswers(questions, answers);
    let pointsEarned = correct * 15;
    if (score === 100) pointsEarned += 25;
    return { score, pointsEarned };
  }

  return { score: null, pointsEarned: 40 };
}

export function isValidMemberIdFormat(memberId: string): boolean {
  return /^IC\d{2,}$/.test(memberId);
}
