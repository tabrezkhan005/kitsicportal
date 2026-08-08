"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kitsic/ui";
import { CheckCircle2, Lightbulb, Paperclip, Sparkles, Users } from "lucide-react";
import { proposeEvent } from "@/lib/platform-actions";
import { toActionErrorMessage } from "@/lib/action-error";

const EVENT_TYPES = [
  "Workshop",
  "Hackathon",
  "Guest talk",
  "Competition",
  "Meetup",
  "Training",
  "Social",
  "Other",
] as const;

interface ProposeEventFormProps {
  onSuccess?: () => void;
}

export function ProposeEventForm({ onSuccess }: ProposeEventFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string>("Workshop");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("event_type", eventType);

    startTransition(async () => {
      try {
        const result = await proposeEvent(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        setSuccess(true);
        router.refresh();
        form.reset();
        setFileName(null);
        setEventType("Workshop");
      } catch (err) {
        setError(toActionErrorMessage(err, "Could not submit your proposal. Please try again."));
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h3 className="mt-3 font-display text-lg font-bold text-primary">Proposal submitted</h3>
        <p className="mt-2 font-body text-sm text-primary/65">
          Leadership will review your idea. You can track it under &quot;Your proposals&quot; on this page.
        </p>
        <Button type="button" className="mt-5 rounded-xl font-ui" onClick={() => onSuccess?.()}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <Lightbulb className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="font-ui text-sm font-semibold text-primary">Share an idea with the club</p>
            <p className="mt-1 font-body text-xs leading-relaxed text-primary/55">
              Tell us what you want to organize. Dates can be finalized later with leadership — focus on the idea first.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 font-body">
          {error}
        </p>
      )}

      <Field
        label="What do you want to call it?"
        name="title"
        required
        placeholder="e.g. Intro to Web3 workshop"
        disabled={isPending}
      />

      <div className="space-y-2">
        <label className="block font-ui text-sm font-semibold text-primary">
          What is this event about? <span className="text-red-500">*</span>
        </label>
        <textarea
          name="about"
          required
          disabled={isPending}
          rows={4}
          placeholder="Describe the topic, activities, outcomes, and why members would enjoy it…"
          className="auth-input-glow w-full resize-none rounded-xl border border-primary/12 bg-white px-3.5 py-3 text-sm outline-none font-body"
        />
      </div>

      <div className="space-y-2">
        <label className="block font-ui text-sm font-semibold text-primary">What kind of event is it?</label>
        <input type="hidden" name="event_type" value={eventType} />
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={isPending}
              onClick={() => setEventType(type)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all font-ui",
                eventType === type
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-primary/12 bg-white text-primary/65 hover:border-primary/25",
              ].join(" ")}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <Field
        label="Who is it for?"
        name="audience"
        placeholder="e.g. All members, CSE batch, beginners in AI"
        disabled={isPending}
        icon={Users}
      />

      <Field
        label="When would you prefer it?"
        name="preferred_timing"
        placeholder="e.g. Second week of March, weekend evening, after mid-exams"
        disabled={isPending}
        hint="Plain words are fine — no need to pick exact dates now."
      />

      <Field
        label="Where should it happen?"
        name="location"
        placeholder="e.g. Seminar hall, online, lab block"
        disabled={isPending}
      />

      <div className="space-y-2">
        <label className="block font-ui text-sm font-semibold text-primary">
          Why should the club host this?
        </label>
        <textarea
          name="why_host"
          disabled={isPending}
          rows={3}
          placeholder="What impact, learning, or value will members get?"
          className="auth-input-glow w-full resize-none rounded-xl border border-primary/12 bg-white px-3.5 py-3 text-sm outline-none font-body"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="attachment" className="block font-ui text-sm font-semibold text-primary">
          Supporting file <span className="font-normal text-primary/45">(optional)</span>
        </label>
        <label
          htmlFor="attachment"
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/15 bg-white px-4 py-3 transition-colors hover:border-accent/40 hover:bg-accent/5"
        >
          <Paperclip className="h-4 w-4 shrink-0 text-primary/45" />
          <span className="font-body text-sm text-primary/60">
            {fileName ?? "Poster, PDF, or brief — up to 15 MB"}
          </span>
          <input
            id="attachment"
            name="attachment"
            type="file"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
            disabled={isPending}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="sr-only"
          />
        </label>
      </div>

      <Button type="submit" disabled={isPending} className="h-11 w-full rounded-xl font-ui">
        {isPending ? (
          "Submitting…"
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Submit proposal
          </>
        )}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  disabled,
  hint,
  icon: Icon,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="flex items-center gap-1.5 font-ui text-sm font-semibold text-primary">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary/45" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="auth-input-glow h-11 w-full rounded-xl border border-primary/12 bg-white px-3.5 text-sm outline-none font-body"
      />
      {hint && <p className="font-body text-xs text-primary/45">{hint}</p>}
    </div>
  );
}
