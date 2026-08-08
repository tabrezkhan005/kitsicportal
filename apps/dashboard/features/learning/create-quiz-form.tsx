"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kitsic/ui";
import { Plus, Trash2 } from "lucide-react";
import type { LearningQuestion, QuestionType } from "@/lib/learning-types";
import { createLearningModule } from "@/lib/platform-actions";
import { toActionErrorMessage } from "@/lib/action-error";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "Multiple choice" },
  { value: "short", label: "Short answer" },
  { value: "true_false", label: "True / False" },
];

function emptyQuestion(type: QuestionType = "mcq"): LearningQuestion {
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (type === "mcq") {
    return {
      id,
      type,
      prompt: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
    };
  }
  if (type === "true_false") {
    return { id, type, prompt: "", answer: "true", explanation: "" };
  }
  return { id, type: "short", prompt: "", answer: "", explanation: "" };
}

interface CreateQuizFormProps {
  onSuccess?: () => void;
}

export function CreateQuizForm({ onSuccess }: CreateQuizFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publish, setPublish] = useState(true);
  const [questions, setQuestions] = useState<LearningQuestion[]>([emptyQuestion("mcq")]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateQuestion(id: string, patch: Partial<LearningQuestion>) {
    setQuestions((prev) => prev.map((question) => (question.id === id ? { ...question, ...patch } : question)));
  }

  function updateOption(questionId: string, optionIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        const options = [...(question.options ?? ["", "", "", ""])];
        options[optionIndex] = value;
        return { ...question, options };
      }),
    );
  }

  function changeQuestionType(id: string, type: QuestionType) {
    setQuestions((prev) => prev.map((question) => (question.id === id ? emptyQuestion(type) : question)));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion("mcq")]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((question) => question.id !== id)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Give your quiz a title.");
      return;
    }

    const cleaned = questions.map((question) => {
      if (!question.prompt.trim()) return null;
      if (question.type === "mcq") {
        const options = (question.options ?? []).map((option) => option.trim()).filter(Boolean);
        if (options.length < 2) return null;
        return {
          ...question,
          prompt: question.prompt.trim(),
          options,
          correctIndex: Math.min(question.correctIndex ?? 0, options.length - 1),
          explanation: question.explanation?.trim() || undefined,
        };
      }
      if (question.type === "true_false") {
        return {
          ...question,
          prompt: question.prompt.trim(),
          answer: question.answer === "false" ? "false" : "true",
          explanation: question.explanation?.trim() || undefined,
        };
      }
      if (!question.answer?.trim()) return null;
      return {
        ...question,
        prompt: question.prompt.trim(),
        answer: question.answer.trim(),
        explanation: question.explanation?.trim() || undefined,
      };
    }).filter(Boolean) as LearningQuestion[];

    if (cleaned.length === 0) {
      setError("Add at least one complete question.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("type", "quiz");
    formData.set("questions", JSON.stringify(cleaned));
    formData.set("publish", publish ? "true" : "false");

    startTransition(async () => {
      try {
        const result = await createLearningModule(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        onSuccess?.();
        router.refresh();
      } catch (err) {
        setError(toActionErrorMessage(err, "Could not create quiz."));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-h-[70dvh] space-y-4 overflow-y-auto pr-1">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Field label="Quiz title" value={title} onChange={setTitle} placeholder="e.g. Git basics challenge" required />
      <TextArea
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="What will members learn from this quiz?"
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-ui text-sm font-semibold text-primary">Questions</p>
          <Button type="button" size="sm" variant="outline" className="rounded-lg font-ui" onClick={addQuestion}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add question
          </Button>
        </div>

        {questions.map((question, index) => (
          <div key={question.id} className="rounded-2xl border border-primary/10 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-ui text-sm font-bold text-primary">Question {index + 1}</p>
              <div className="flex items-center gap-2">
                <select
                  value={question.type ?? "mcq"}
                  onChange={(e) => changeQuestionType(question.id, e.target.value as QuestionType)}
                  className="rounded-lg border border-primary/12 bg-white px-2 py-1 text-xs font-ui"
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeQuestion(question.id)}
                  className="rounded-lg p-1.5 text-primary/35 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <TextArea
              label="Question"
              value={question.prompt}
              onChange={(value) => updateQuestion(question.id, { prompt: value })}
              placeholder="Ask your question…"
              rows={2}
            />

            {question.type === "mcq" && (
              <div className="mt-3 space-y-2">
                <p className="font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">Options</p>
                {(question.options ?? ["", "", "", ""]).map((option, optionIndex) => (
                  <label key={optionIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={(question.correctIndex ?? 0) === optionIndex}
                      onChange={() => updateQuestion(question.id, { correctIndex: optionIndex })}
                    />
                    <input
                      value={option}
                      onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                      className="auth-input-glow h-10 flex-1 rounded-lg border border-primary/12 px-3 text-sm outline-none font-body"
                    />
                  </label>
                ))}
              </div>
            )}

            {question.type === "short" && (
              <Field
                label="Correct answer"
                value={question.answer ?? ""}
                onChange={(value) => updateQuestion(question.id, { answer: value })}
                placeholder="Expected short answer"
              />
            )}

            {question.type === "true_false" && (
              <div className="mt-3 flex gap-2">
                {(["true", "false"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateQuestion(question.id, { answer: value })}
                    className={[
                      "rounded-lg border px-4 py-2 text-sm font-semibold capitalize font-ui",
                      question.answer === value
                        ? "border-primary bg-primary text-white"
                        : "border-primary/12 text-primary/65",
                    ].join(" ")}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}

            <TextArea
              label="Feedback hint (shown after answering)"
              value={question.explanation ?? ""}
              onChange={(value) => updateQuestion(question.id, { explanation: value })}
              placeholder="Explain why the answer is correct or share a learning tip"
              rows={2}
            />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 font-body text-sm text-primary/70">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        Publish immediately for members
      </label>

      <Button type="submit" disabled={isPending} className="h-11 w-full rounded-xl font-ui">
        {isPending ? "Creating…" : "Create quiz"}
      </Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-ui text-sm font-semibold text-primary">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="auth-input-glow h-11 w-full rounded-xl border border-primary/12 bg-white px-3.5 text-sm outline-none font-body"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-ui text-sm font-semibold text-primary">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="auth-input-glow w-full resize-none rounded-xl border border-primary/12 bg-white px-3.5 py-3 text-sm outline-none font-body"
      />
    </label>
  );
}
