"use client";

import { Button, Input, Label } from "@kitsic/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toActionErrorMessage } from "@/lib/action-error";

interface CreateFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string; data?: Record<string, unknown> }>;
  fields: Array<{
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
  }>;
  hiddenValues?: Record<string, string>;
  submitLabel?: string;
  onSuccess?: (result?: Record<string, unknown>) => void;
}

export function CreateForm({ action, fields, hiddenValues, submitLabel = "Create", onSuccess }: CreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        onSuccess?.(result.data);
        router.refresh();
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(toActionErrorMessage(err, "Something went wrong. Please try again."));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hiddenValues &&
        Object.entries(hiddenValues).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {fields.map((field) => (
        field.type === "hidden" ? (
          <input key={field.name} type="hidden" name={field.name} value={hiddenValues?.[field.name] ?? ""} />
        ) : (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.options ? (
            <select
              id={field.name}
              name={field.name}
              required={field.required}
              className="flex h-10 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="">Select…</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              id={field.name}
              name={field.name}
              required={field.required}
              placeholder={field.placeholder}
              rows={3}
              className="flex w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          ) : (
            <Input
              id={field.name}
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              placeholder={field.placeholder}
            />
          )}
        </div>
        )
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
