import { describe, expect, it } from "vitest";
import {
  calculateLearningPoints,
  isValidMemberIdFormat,
  scoreQuizAnswers,
} from "@/lib/learning-points";

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
