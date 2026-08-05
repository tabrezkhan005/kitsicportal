"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@kitsic/ui";
import { Paperclip } from "lucide-react";
import { proposeEvent } from "@/lib/platform-actions";

interface ProposeEventFormProps {
  onSuccess?: () => void;
}

export function ProposeEventForm({ onSuccess }: ProposeEventFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await proposeEvent(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-body">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Event title *</Label>
        <Input id="title" name="title" required disabled={isPending} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          disabled={isPending}
          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" disabled={isPending} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="starts_at">Proposed start</Label>
          <Input id="starts_at" name="starts_at" type="datetime-local" disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ends_at">Proposed end</Label>
          <Input id="ends_at" name="ends_at" type="datetime-local" disabled={isPending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="attachment">Attachment (image, PDF, or document)</Label>
        <div className="flex items-center gap-3">
          <Input
            id="attachment"
            name="attachment"
            type="file"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
            disabled={isPending}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="font-body"
          />
        </div>
        {fileName && (
          <p className="flex items-center gap-1.5 text-xs text-muted font-body">
            <Paperclip className="h-3.5 w-3.5" />
            {fileName}
          </p>
        )}
        <p className="text-xs text-muted font-body">Max 15 MB. Stored securely in club storage.</p>
      </div>

      <Button type="submit" disabled={isPending} className="w-full font-ui">
        {isPending ? "Submitting…" : "Submit proposal"}
      </Button>
    </form>
  );
}
