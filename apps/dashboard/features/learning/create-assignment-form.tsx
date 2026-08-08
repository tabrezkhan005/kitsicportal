"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kitsic/ui";
import { createLearningModule } from "@/lib/platform-actions";
import { toActionErrorMessage } from "@/lib/action-error";

interface CreateAssignmentFormProps {
  onSuccess?: () => void;
}

export function CreateAssignmentForm({ onSuccess }: CreateAssignmentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [publish, setPublish] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !prompt.trim()) {
      setError("Title and prompt are required.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("type", "assignment");
    formData.set(
      "questions",
      JSON.stringify([{ id: "a1", type: "short", prompt: prompt.trim() }]),
    );
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
        setError(toActionErrorMessage(err, "Could not create assignment."));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <label className="block space-y-1.5">
        <span className="font-ui text-sm font-semibold text-primary">Assignment title *</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="auth-input-glow h-11 w-full rounded-xl border border-primary/12 px-3.5 text-sm outline-none font-body"
          required
        />
      </label>
      <label className="block space-y-1.5">
        <span className="font-ui text-sm font-semibold text-primary">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="auth-input-glow w-full rounded-xl border border-primary/12 px-3.5 py-3 text-sm outline-none font-body"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="font-ui text-sm font-semibold text-primary">What should members submit? *</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Write a one-paragraph event proposal with audience and expected outcome."
          className="auth-input-glow w-full rounded-xl border border-primary/12 px-3.5 py-3 text-sm outline-none font-body"
          required
        />
      </label>
      <label className="flex items-center gap-2 font-body text-sm text-primary/70">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        Publish immediately
      </label>
      <Button type="submit" disabled={isPending} className="w-full rounded-xl font-ui">
        {isPending ? "Creating…" : "Create assignment"}
      </Button>
    </form>
  );
}
