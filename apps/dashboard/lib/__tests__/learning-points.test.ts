import { describe, expect, it } from "vitest";
import {
  calculateLearningPoints,
  isValidMemberIdFormat,
  scoreQuizAnswers,
} from "@/lib/learning-points";
import { gradeAnswer, normalizeQuestion } from "@/lib/learning-questions";

const questions = [
  { id: "q1", answer: "git init" },
  { id: "q2", answer: "upload commits" },
  { id: "q3", answer: "code review" },
];

describe("learning-points", () => {
  it("scores quiz answers case-insensitively", () => {
    const { score, correct, total } = scoreQuizAnswers(questions, {
      q1: "Git Init",
      q2: "upload commits",
      q3: "wrong",
    });
    expect(total).toBe(3);
    expect(correct).toBe(2);
    expect(score).toBe(67);
  });

  it("awards quiz points with perfect-score bonus", () => {
    const answers = { q1: "git init", q2: "upload commits", q3: "code review" };
    const perfect = calculateLearningPoints("quiz", questions, answers);
    expect(perfect.score).toBe(100);
    expect(perfect.pointsEarned).toBe(3 * 15 + 25);

    const partial = calculateLearningPoints("quiz", questions, {
      q1: "git init",
      q2: "nope",
      q3: "nope",
    });
    expect(partial.score).toBe(33);
    expect(partial.pointsEarned).toBe(15);
  });

  it("awards fixed points for assignments", () => {
    const result = calculateLearningPoints("assignment", [{ id: "a1" }], { a1: "proposal text" });
    expect(result.score).toBeNull();
    expect(result.pointsEarned).toBe(40);
  });

  it("validates IC member id format", () => {
    expect(isValidMemberIdFormat("IC01")).toBe(true);
    expect(isValidMemberIdFormat("IC99")).toBe(true);
    expect(isValidMemberIdFormat("IC100")).toBe(true);
    expect(isValidMemberIdFormat("KITSIC-2026-0001")).toBe(false);
    expect(isValidMemberIdFormat("ic01")).toBe(false);
  });
});

describe("learning-questions", () => {
  it("grades mcq answers by option index", () => {
    const question = normalizeQuestion({
      id: "m1",
      type: "mcq",
      prompt: "Pick one",
      options: ["Alpha", "Beta", "Gamma"],
      correctIndex: 1,
      explanation: "Beta is correct because…",
    });

    const correct = gradeAnswer(question, "1");
    expect(correct.correct).toBe(true);
    expect(correct.explanation).toBe("Beta is correct because…");

    const wrong = gradeAnswer(question, "0");
    expect(wrong.correct).toBe(false);
    expect(wrong.correctAnswer).toBe("Beta");
  });

  it("grades true/false answers", () => {
    const question = normalizeQuestion({
      id: "t1",
      type: "true_false",
      prompt: "Git is a version control system",
      answer: "true",
    });

    expect(gradeAnswer(question, "true").correct).toBe(true);
    expect(gradeAnswer(question, "false").correct).toBe(false);
  });
});
