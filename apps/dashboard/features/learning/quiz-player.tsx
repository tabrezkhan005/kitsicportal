"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kitsic/ui";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { cn } from "@kitsic/utils";
import type { GradeResult, PlayerQuestion } from "@/lib/learning-types";
import { gradeQuizAnswer, submitLearningModule } from "@/lib/platform-actions";
import { toActionErrorMessage } from "@/lib/action-error";

interface QuizBreakdownItem extends GradeResult {
  id: string;
}

interface QuizPlayerProps {
  moduleId: string;
  title: string;
  questions: PlayerQuestion[];
  onDone: () => void;
}

export function QuizPlayer({ moduleId, title, questions, onDone }: QuizPlayerProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, GradeResult>>({});
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [phase, setPhase] = useState<"playing" | "summary" | "complete">("playing");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<{
    score?: number;
    pointsEarned?: number;
    breakdown?: QuizBreakdownItem[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = questions[index];
  const checked = current ? Boolean(feedback[current.id]) : false;
  const currentFeedback = current ? feedback[current.id] : undefined;
  const progress = questions.length > 0 ? ((index + (checked ? 1 : 0)) / questions.length) * 100 : 0;
  const correctCount = useMemo(
    () => Object.values(feedback).filter((item) => item.correct).length,
    [feedback],
  );

  function setCurrentAnswer(value: string) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  function handleCheckAnswer() {
    if (!current || !answers[current.id]?.trim()) return;

    startTransition(async () => {
      const result = await gradeQuizAnswer(moduleId, current.id, answers[current.id]);
      if (result.error || !result.data) {
        setSubmitError(result.error ?? "Could not check answer.");
        return;
      }

      const graded = result.data as unknown as GradeResult;
      setSubmitError(null);
      setFeedback((prev) => ({ ...prev, [current.id]: graded }));

      if (graded.correct) {
        setStreak((prev) => {
          const next = prev + 1;
          setBestStreak((best) => Math.max(best, next));
          return next;
        });
      } else {
        setStreak(0);
      }
    });
  }

  function handleNext() {
    if (index < questions.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }
    setPhase("summary");
  }

  function handleSubmitQuiz() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("module_id", moduleId);
        formData.set("answers", JSON.stringify(answers));

        const response = await submitLearningModule(formData);
        if (response.error) {
          setSubmitError(response.error);
          return;
        }

        setFinalResult(response.data as typeof finalResult);
        setPhase("complete");
        router.refresh();
      } catch (err) {
        setSubmitError(toActionErrorMessage(err, "Could not submit quiz."));
      }
    });
  }

  if (questions.length === 0) {
    return <p className="font-body text-sm text-muted">This quiz has no questions yet.</p>;
  }

  if (phase === "complete" && finalResult) {
    const breakdown = (finalResult.breakdown ?? []) as QuizBreakdownItem[];
    return (
      <div className="space-y-5 py-2">
        <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 to-primary/5 px-5 py-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
            <Trophy className="h-8 w-8 text-accent" />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-primary">Quiz complete!</p>
          <p className="mt-1 font-body text-sm text-primary/60">{title}</p>
          {finalResult.score != null && (
            <p className="mt-4 font-display text-4xl font-extrabold text-primary">{finalResult.score}%</p>
          )}
          {finalResult.pointsEarned != null && (
            <p className="mt-2 font-ui text-lg font-semibold text-accent">+{finalResult.pointsEarned} points</p>
          )}
          {bestStreak > 1 && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
              <Flame className="h-3.5 w-3.5" />
              Best streak: {bestStreak}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {breakdown.map((item, itemIndex) => (
            <div
              key={item.id}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                item.correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50",
              )}
            >
              <div className="flex items-start gap-2">
                {item.correct ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <div>
                  <p className="font-ui text-sm font-semibold text-primary">
                    Q{itemIndex + 1}. {item.correct ? "Correct" : "Incorrect"}
                  </p>
                  {item.explanation && (
                    <p className="mt-1 font-body text-xs text-primary/65">{item.explanation}</p>
                  )}
                  {!item.correct && item.correctAnswer && (
                    <p className="mt-1 font-body text-xs text-primary/55">
                      Expected: <span className="font-semibold">{item.correctAnswer}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" className="w-full rounded-xl font-ui" onClick={onDone}>
          Back to learning
        </Button>
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-4 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-accent" />
          <p className="mt-2 font-display text-lg font-bold text-primary">Ready to submit?</p>
          <p className="mt-1 font-body text-sm text-primary/60">
            You got {correctCount} of {questions.length} correct during practice checks.
          </p>
        </div>

        {submitError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
        )}

        <Button type="button" className="w-full rounded-xl font-ui" disabled={isPending} onClick={handleSubmitQuiz}>
          {isPending ? "Submitting…" : "Submit quiz & earn points"}
        </Button>
        <Button type="button" variant="outline" className="w-full rounded-xl font-ui" onClick={() => setPhase("playing")}>
          Review answers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">
            Question {index + 1} of {questions.length}
          </p>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700">
              <Flame className="h-3.5 w-3.5" />
              {streak} streak
            </span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-primary/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((question, questionIndex) => {
            const state = feedback[question.id];
            return (
              <span
                key={question.id}
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  questionIndex === index ? "ring-2 ring-accent ring-offset-1" : "",
                  state?.correct ? "bg-emerald-500" : state ? "bg-red-400" : "bg-primary/15",
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
        <p className="font-display text-lg font-bold leading-snug text-primary">{current.prompt}</p>
        <p className="mt-1 font-body text-xs capitalize text-primary/45">{current.type.replace("_", " ")}</p>

        <div className="mt-4 space-y-3">
          {current.type === "mcq" && (
            <div className="grid gap-2">
              {(current.options ?? []).map((option, optionIndex) => {
                const selected = answers[current.id] === String(optionIndex);
                const reveal = checked && currentFeedback;
                const isCorrectOption =
                  reveal &&
                  (option === currentFeedback.correctAnswer ||
                    (currentFeedback.correct && selected));

                return (
                  <button
                    key={`${current.id}-${optionIndex}`}
                    type="button"
                    disabled={checked || isPending}
                    onClick={() => setCurrentAnswer(String(optionIndex))}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left text-sm font-ui transition-all",
                      selected && !checked && "border-primary bg-primary/5 text-primary",
                      !selected && !checked && "border-primary/10 hover:border-primary/25",
                      isCorrectOption && "border-emerald-500 bg-emerald-50 text-emerald-800",
                      reveal && selected && !currentFeedback?.correct && "border-red-500 bg-red-50 text-red-800",
                      checked && "cursor-default",
                    )}
                  >
                    <span className="mr-2 font-bold text-primary/40">{String.fromCharCode(65 + optionIndex)}.</span>
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "true_false" && (
            <div className="grid grid-cols-2 gap-2">
              {["true", "false"].map((value) => {
                const selected = answers[current.id] === value;
                const reveal = checked && currentFeedback;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={checked || isPending}
                    onClick={() => setCurrentAnswer(value)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-semibold capitalize font-ui transition-all",
                      selected && !checked && "border-primary bg-primary/5",
                      reveal && selected && currentFeedback?.correct && "border-emerald-500 bg-emerald-50 text-emerald-800",
                      reveal && selected && !currentFeedback?.correct && "border-red-500 bg-red-50 text-red-800",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "short" && (
            <input
              value={answers[current.id] ?? ""}
              disabled={checked || isPending}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer…"
              className="auth-input-glow h-11 w-full rounded-xl border border-primary/12 bg-white px-3.5 text-sm outline-none font-body"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !checked) handleCheckAnswer();
              }}
            />
          )}
        </div>

        {checked && currentFeedback && (
          <div
            className={cn(
              "mt-4 rounded-xl border px-3 py-3",
              currentFeedback.correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50",
            )}
          >
            <div className="flex items-start gap-2">
              {currentFeedback.correct ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <div>
                <p className="font-ui text-sm font-semibold text-primary">{currentFeedback.feedback}</p>
                {currentFeedback.explanation && (
                  <p className="mt-1 font-body text-xs text-primary/65">{currentFeedback.explanation}</p>
                )}
                {!currentFeedback.correct && currentFeedback.correctAnswer && (
                  <p className="mt-1 font-body text-xs text-primary/55">
                    Correct answer: <span className="font-semibold">{currentFeedback.correctAnswer}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {submitError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
      )}

      <div className="flex gap-2">
        {!checked ? (
          <Button
            type="button"
            className="flex-1 rounded-xl font-ui"
            disabled={isPending || !answers[current.id]?.trim()}
            onClick={handleCheckAnswer}
          >
            {isPending ? "Checking…" : "Check answer"}
          </Button>
        ) : (
          <Button type="button" className="flex-1 rounded-xl font-ui" onClick={handleNext}>
            {index < questions.length - 1 ? (
              <>
                Next question
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              "See results"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
