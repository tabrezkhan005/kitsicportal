import type { GradeResult, LearningQuestion, PlayerQuestion, QuestionType } from "@/lib/learning-types";

export function inferQuestionType(question: LearningQuestion): QuestionType {
  if (question.type) return question.type;
  if (question.options && question.options.length > 0) return "mcq";
  if (question.answer === "true" || question.answer === "false") return "true_false";
  return "short";
}

export function normalizeQuestion(raw: LearningQuestion): LearningQuestion & { type: QuestionType } {
  const type = inferQuestionType(raw);
  return {
    ...raw,
    type,
    options: type === "mcq" ? (raw.options ?? []) : undefined,
    correctIndex:
      type === "mcq"
        ? typeof raw.correctIndex === "number"
          ? raw.correctIndex
          : raw.options?.findIndex(
              (option) => option.trim().toLowerCase() === raw.answer?.trim().toLowerCase(),
            ) ?? 0
        : undefined,
  };
}

export function normalizeQuestions(raw: unknown): Array<LearningQuestion & { type: QuestionType }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is LearningQuestion => Boolean(item && typeof item === "object" && "id" in item))
    .map((item) => normalizeQuestion({ ...item, prompt: item.prompt ?? "" }))
    .filter((item) => item.id);
}

export function toPlayerQuestion(question: LearningQuestion & { type: QuestionType }): PlayerQuestion {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    options: question.type === "mcq" ? question.options : undefined,
  };
}

export function stripQuestionsForPlayer(raw: unknown): PlayerQuestion[] {
  return normalizeQuestions(raw).map(toPlayerQuestion);
}

function shortAnswerMatches(userAnswer: string, question: LearningQuestion): boolean {
  const normalized = userAnswer.trim().toLowerCase();
  if (!normalized) return false;

  const targets = [question.answer, ...(question.acceptableAnswers ?? [])]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());

  return targets.some((target) => normalized === target);
}

export function gradeAnswer(question: LearningQuestion & { type: QuestionType }, userAnswer: string): GradeResult {
  const trimmed = userAnswer.trim();

  if (question.type === "mcq") {
    const options = question.options ?? [];
    const correctIndex = question.correctIndex ?? 0;
    const correctOption = options[correctIndex] ?? "";
    const selectedIndex = Number.parseInt(trimmed, 10);
    const correct =
      (!Number.isNaN(selectedIndex) && selectedIndex === correctIndex) ||
      trimmed.toLowerCase() === correctOption.trim().toLowerCase();

    return {
      correct,
      feedback: correct ? "Correct!" : "Not quite — try to remember this one.",
      explanation: question.explanation,
      correctAnswer: correct ? undefined : correctOption,
    };
  }

  if (question.type === "true_false") {
    const normalized = trimmed.toLowerCase();
    const expected = (question.answer ?? "true").toLowerCase();
    const correct = normalized === expected;

    return {
      correct,
      feedback: correct ? "Correct!" : `The right answer is ${expected === "true" ? "True" : "False"}.`,
      explanation: question.explanation,
      correctAnswer: correct ? undefined : expected === "true" ? "True" : "False",
    };
  }

  const correct = shortAnswerMatches(trimmed, question);
  return {
    correct,
    feedback: correct ? "Correct!" : "Not quite — check the expected phrasing.",
    explanation: question.explanation,
    correctAnswer: correct ? undefined : question.answer,
  };
}

export function buildFeedbackSummary(results: GradeResult[]): string {
  const correct = results.filter((result) => result.correct).length;
  return `${correct}/${results.length} correct`;
}
