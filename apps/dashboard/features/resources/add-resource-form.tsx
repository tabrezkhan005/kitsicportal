"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@kitsic/ui";
import { createResource } from "@/lib/platform-actions";
import { RESOURCE_CATEGORIES } from "@/lib/platform-constants";

interface AddResourceFormProps {
  onSuccess?: () => void;
}

export function AddResourceForm({ onSuccess }: AddResourceFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createResource(formData);
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
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required disabled={isPending} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="url">Link (optional if uploading a file)</Label>
        <Input id="url" name="url" type="url" placeholder="https://..." disabled={isPending} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="attachment">Or upload a document</Label>
        <Input
          id="attachment"
          name="attachment"
          type="file"
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
          disabled={isPending}
          className="font-body"
        />
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
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          disabled={isPending}
          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-body"
        >
          {RESOURCE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={isPending} className="w-full font-ui">
        {isPending ? "Saving…" : "Add resource"}
      </Button>
    </form>
  );
}
